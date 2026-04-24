
import { Client } from 'ssh2';
import readline from 'node:readline';

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

const safeCmdFast =
  'set -e; ' +
  'cd SymiCRMERP; ' +
  'TS=$(date +%s); ' +
  'BACKUP_DIR=/tmp/symicrm_backup_$TS; ' +
  'mkdir -p $BACKUP_DIR; ' +
  'tar -czf $BACKUP_DIR/uploads.tgz server/img server/doc 2>/dev/null || true; ' +
  'git fetch --all; ' +
  'git reset --hard origin/main; ' +
  'tar -xzf $BACKUP_DIR/uploads.tgz -C . 2>/dev/null || true; ' +
  'export PUPPETEER_SKIP_DOWNLOAD=1; ' +
  '(npm ci || npm install); ' +
  'npm run build; ' +
  'pm2 restart symi-crm || (DATABASE_URL=postgresql://symicrm:postgres@localhost:5432/symicrm NODE_ENV=production pm2 start npm --name symi-crm -- run start); ' +
  'pm2 save; ' +
  'pm2 list;';

const safeCmdFull =
  'set -e; ' +
  'read -r SUDO_PASS; ' +
  'sudo_pw() { echo "$SUDO_PASS" | sudo -S -p "" "$@"; }; ' +
  'cd SymiCRMERP; ' +
  'TS=$(date +%s); ' +
  'BACKUP_DIR=/tmp/symicrm_backup_$TS; ' +
  'mkdir -p $BACKUP_DIR; ' +
  'tar -czf $BACKUP_DIR/uploads.tgz server/img server/doc 2>/dev/null || true; ' +
  'git fetch --all; ' +
  'git reset --hard origin/main; ' +
  'tar -xzf $BACKUP_DIR/uploads.tgz -C . 2>/dev/null || true; ' +
  'export PUPPETEER_SKIP_DOWNLOAD=1; ' +
  '(npm ci || npm install); ' +
  'npm run build; ' +
  'if ! command -v psql >/dev/null 2>&1; then ' +
    'sudo_pw apt-get update -y; ' +
    'sudo_pw apt-get install -y postgresql postgresql-contrib; ' +
  'fi; ' +
  'sudo_pw systemctl enable --now postgresql || true; ' +
  'sudo_pw -u postgres psql -d postgres -c "CREATE ROLE symicrm LOGIN PASSWORD \'postgres\';" || true; ' +
  'sudo_pw -u postgres createdb -O symicrm symicrm || true; ' +
  'sudo_pw -u postgres psql -d postgres -c "ALTER USER symicrm WITH PASSWORD \'postgres\';" || true; ' +
  'sudo_pw -u postgres pg_restore -d symicrm --role=symicrm --no-owner --no-privileges --clean --if-exists data/symicrm.dump; ' +
  'pm2 delete symi-crm || true; ' +
  'DATABASE_URL=postgresql://symicrm:postgres@localhost:5432/symicrm NODE_ENV=production pm2 start npm --name symi-crm -- run start; ' +
  'pm2 save; ' +
  'pm2 list;';

const main = async () => {
  const host = process.env.DEPLOY_HOST || '78.188.54.69';
  const port = process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 2121;
  const username = process.env.DEPLOY_USER || 'aknkrds';

  const deployFull = process.env.DEPLOY_FULL === '1';
  const safeCmd = deployFull ? safeCmdFull : safeCmdFast;

  const agent = process.env.SSH_AUTH_SOCK;
  console.log(`Deploy target: ${username}@${host}:${port}`);
  const password = process.env.DEPLOY_PASSWORD || null;
  if (deployFull && !password) {
    console.error('DEPLOY_FULL=1 için DEPLOY_PASSWORD gerekli.');
    process.exit(1);
  }
  if (!password) {
    console.log('SSH agent ile bağlanmayı deniyorum (DEPLOY_PASSWORD verilmedi).');
  }

  const conn = new Client();
  conn.on('ready', () => {
    console.log('Client :: ready');
    console.log('Executing deploy command...');
    conn.exec(safeCmd, (err, stream) => {
      if (err) {
        console.error(err.message);
        conn.end();
        process.exit(1);
      }
      if (deployFull) {
        stream.write(`${password}\n`);
      }
      stream.on('close', (code, signal) => {
        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
        conn.end();
        process.exit(code || 0);
      }).on('data', (data) => {
        process.stdout.write(data);
      }).stderr.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }).on('error', (e) => {
    console.error(e.message);
    process.exit(1);
  });

  const readyTimeout = process.env.DEPLOY_READY_TIMEOUT ? parseInt(process.env.DEPLOY_READY_TIMEOUT, 10) : 60000;
  const connectOptions = {
    host,
    port,
    username,
    agent,
    tryKeyboard: true,
    readyTimeout,
    keepaliveInterval: 15000
  };

  if (password) {
    conn.connect({ ...connectOptions, password });
  } else {
    conn.connect(connectOptions);
  }
};

main();
