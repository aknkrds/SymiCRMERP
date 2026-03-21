import { Client } from 'ssh2';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import process from 'node:process';

const askHidden = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.stdoutMuted = true;
  rl._writeToOutput = function _writeToOutput(stringToWrite) {
    if (rl.stdoutMuted) {
      if (stringToWrite.trim().length === 0) rl.output.write(stringToWrite);
      else rl.output.write('*');
    } else {
      rl.output.write(stringToWrite);
    }
  };
  rl.question(question, (answer) => {
    rl.stdoutMuted = false;
    rl.output.write('\n');
    rl.close();
    resolve(answer);
  });
});

const execRemote = (conn, command) => new Promise((resolve, reject) => {
  conn.exec(command, (err, stream) => {
    if (err) return reject(err);
    let stdout = '';
    let stderr = '';
    stream.on('close', (code) => resolve({ code, stdout, stderr }))
      .on('data', (data) => { stdout += data.toString(); })
      .stderr.on('data', (data) => { stderr += data.toString(); });
  });
});

const downloadRemoteFile = (conn, remotePath, localPath) => new Promise((resolve, reject) => {
  const cmd = `set -e; cat '${remotePath.replace(/'/g, "'\\''")}'`;
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    const out = fs.createWriteStream(localPath);
    let stderr = '';
    stream.pipe(out);
    stream.stderr.on('data', (data) => { stderr += data.toString(); });
    stream.on('close', (code) => {
      out.close();
      if (code === 0) return resolve(localPath);
      reject(new Error(stderr || `Download failed: ${remotePath}`));
    });
  });
});

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const main = async () => {
  const host = process.env.DEPLOY_HOST || '78.188.54.69';
  const port = process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 2121;
  const username = process.env.DEPLOY_USER || 'aknkrds';
  const password = process.env.DEPLOY_PASSWORD || await askHidden('SSH Password: ');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const localBaseDir = path.join(process.cwd(), 'server-backups', `symicrm_${timestamp}`);
  ensureDir(localBaseDir);

  const conn = new Client();
  const connected = await new Promise((resolve, reject) => {
    conn.on('ready', () => resolve(true))
      .on('error', reject)
      .connect({ host, port, username, password });
  }).catch((e) => {
    throw new Error(`SSH bağlantısı başarısız: ${e?.message || e}`);
  });

  if (!connected) throw new Error('SSH bağlantısı kurulamadı');

  const safePathCmd = 'set -e; cd SymiCRMERP; pwd';
  const pwdRes = await execRemote(conn, safePathCmd);
  if (pwdRes.code !== 0) {
    conn.end();
    throw new Error(`Uygulama klasörü bulunamadı. STDERR: ${pwdRes.stderr}`);
  }
  const appDir = (pwdRes.stdout || '').trim().split('\n').pop();

  const homeRes = await execRemote(conn, 'echo $HOME');
  if (homeRes.code !== 0) {
    conn.end();
    throw new Error('Sunucu HOME dizini alınamadı.');
  }
  const homeDir = (homeRes.stdout || '').trim().split('\n').pop();

  const remoteBackupDir = `${homeDir}/symicrm_backups/symicrm_${timestamp}`;
  const remoteBackupTar = `${homeDir}/symicrm_backups/symicrm_${timestamp}.tgz`;
  const prepCmd =
    'set -e; ' +
    `mkdir -p ${homeDir}/symicrm_backups; ` +
    `mkdir -p ${remoteBackupDir}; ` +
    `cd ${appDir}; ` +
    `echo "APP_DIR=${appDir}" > ${remoteBackupDir}/meta.txt; ` +
    `echo "DATE=$(date -Iseconds)" >> ${remoteBackupDir}/meta.txt; ` +
    `node -v >> ${remoteBackupDir}/meta.txt 2>/dev/null || true; ` +
    `npm -v >> ${remoteBackupDir}/meta.txt 2>/dev/null || true; ` +
    `pm2 -v >> ${remoteBackupDir}/meta.txt 2>/dev/null || true; ` +
    `pm2 list > ${remoteBackupDir}/pm2_list.txt 2>/dev/null || true; ` +
    `pm2 save > ${remoteBackupDir}/pm2_save.txt 2>/dev/null || true; ` +
    `cp -f ~/.pm2/dump.pm2 ${remoteBackupDir}/pm2_dump.pm2 2>/dev/null || true; ` +
    `cp -f crm.db ${remoteBackupDir}/crm.db.copy 2>/dev/null || true; ` +
    `sqlite3 crm.db ".backup '${remoteBackupDir}/crm.db.sqlite_backup'" 2>/dev/null || true; ` +
    `tar -czf ${remoteBackupDir}/uploads.tgz server/img server/doc 2>/dev/null || true; ` +
    `git rev-parse HEAD > ${remoteBackupDir}/git_head.txt 2>/dev/null || true; ` +
    `ls -la > ${remoteBackupDir}/ls_root.txt 2>/dev/null || true; ` +
    `tar -czf ${remoteBackupTar} -C ${remoteBackupDir} . 2>/dev/null || true; ` +
    `echo ${remoteBackupTar} > ${remoteBackupDir}/backup_tar_path.txt; `;

  const prepRes = await execRemote(conn, prepCmd);
  if (prepRes.code !== 0) {
    conn.end();
    throw new Error(`Sunucuda yedek hazırlığı başarısız. STDERR: ${prepRes.stderr}`);
  }

  const filesToTry = [
    { remote: `${remoteBackupDir}/meta.txt`, local: 'meta.txt' },
    { remote: `${remoteBackupDir}/pm2_list.txt`, local: 'pm2_list.txt' },
    { remote: `${remoteBackupDir}/pm2_save.txt`, local: 'pm2_save.txt' },
    { remote: `${remoteBackupDir}/pm2_dump.pm2`, local: 'pm2_dump.pm2' },
    { remote: `${remoteBackupDir}/git_head.txt`, local: 'git_head.txt' },
    { remote: `${remoteBackupDir}/uploads.tgz`, local: 'uploads.tgz' },
    { remote: `${remoteBackupDir}/crm.db.sqlite_backup`, local: 'crm.db' },
    { remote: `${remoteBackupDir}/crm.db.copy`, local: 'crm.db.copy' },
    { remote: remoteBackupTar, local: 'server_backup.tgz' },
  ];

  const downloaded = [];
  for (const f of filesToTry) {
    try {
      const lp = await downloadRemoteFile(conn, f.remote, path.join(localBaseDir, f.local));
      downloaded.push(lp);
    } catch (e) {
      continue;
    }
  }

  if (process.env.CLEAN_REMOTE === '1') {
    await execRemote(conn, `rm -rf ${remoteBackupDir} 2>/dev/null || true;`);
  }
  conn.end();

  if (downloaded.length === 0) {
    throw new Error('Yedek dosyaları indirilemedi.');
  }

  process.stdout.write(`Yedek alındı: ${localBaseDir}\n`);
  process.stdout.write(downloaded.map(p => `- ${p}`).join('\n') + '\n');

  const downloadedDbPath = path.join(localBaseDir, 'crm.db');
  if (fs.existsSync(downloadedDbPath)) {
    const localDbPath = path.join(process.cwd(), 'crm.db');
    if (fs.existsSync(localDbPath)) {
      const localBackupPath = path.join(process.cwd(), `crm.db.local_backup_${timestamp}`);
      fs.copyFileSync(localDbPath, localBackupPath);
    }
    fs.copyFileSync(downloadedDbPath, localDbPath);
    process.stdout.write(`Local crm.db güncellendi: ${localDbPath}\n`);
  } else {
    process.stdout.write('Uyarı: crm.db indirilemediği için local crm.db güncellenmedi.\n');
  }
};

main().catch((e) => {
  process.stderr.write((e?.message || String(e)) + '\n');
  process.exit(1);
});
