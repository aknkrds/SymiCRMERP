import { Client } from 'ssh2';
import process from 'node:process';

const host = process.env.DEPLOY_HOST || '78.188.54.69';
const port = process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 2121;
const username = process.env.DEPLOY_USER || 'aknkrds';
const password = process.env.DEPLOY_PASSWORD;
const loginUsername = process.env.LOGIN_USERNAME || 'aknkrds';
const loginPassword = process.env.LOGIN_PASSWORD;

if (!password) {
  process.stderr.write('DEPLOY_PASSWORD gerekli.\n');
  process.exit(1);
}
if (!loginPassword) {
  process.stderr.write('LOGIN_PASSWORD gerekli.\n');
  process.exit(1);
}

const exec = (conn, cmd) => new Promise((resolve, reject) => {
  conn.exec(cmd, (err, stream) => {
    if (err) return reject(err);
    let out = '';
    let errOut = '';
    stream.on('data', (d) => { out += d.toString(); });
    stream.stderr.on('data', (d) => { errOut += d.toString(); });
    stream.on('close', (code) => resolve({ code, out, err: errOut }));
  });
});

const shQuote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

const main = async () => {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({ host, port, username, password });
  });

  const tsCmd = "date -u +%Y%m%dT%H%M%SZ";
  const tsRes = await exec(conn, tsCmd);
  if (tsRes.code !== 0) {
    conn.end();
    throw new Error('Timestamp alınamadı');
  }
  const ts = tsRes.out.trim().split('\n').pop();

  const backupCmd = `set -e; mkdir -p /home/aknkrds/symicrm_backups; cd /home/aknkrds/SymiCRMERP; cp crm.db /home/aknkrds/symicrm_backups/crm.db.before_login_fix_${ts}; ls -lah /home/aknkrds/symicrm_backups/crm.db.before_login_fix_${ts}`;
  const backupRes = await exec(conn, backupCmd);
  process.stdout.write(backupRes.out);
  if (backupRes.code !== 0) {
    process.stderr.write(backupRes.err);
    conn.end();
    process.exit(1);
  }

  const fixCmd =
    'set -e; cd /home/aknkrds/SymiCRMERP; ' +
    `LOGIN_USERNAME=${shQuote(loginUsername)} LOGIN_PASSWORD=${shQuote(loginPassword)} ` +
    `node -e "const Database=require('better-sqlite3'); const crypto=require('crypto'); const db=new Database('crm.db'); const u=process.env.LOGIN_USERNAME; const p=process.env.LOGIN_PASSWORD; const now=new Date().toISOString(); const existing=db.prepare('SELECT id FROM users WHERE username = ?').get(u); if(existing){ db.prepare('UPDATE users SET password = ?, isActive = 1, roleId = ?, fullName = COALESCE(fullName, ?) WHERE username = ?').run(p,'1',u,u); console.log('updated',u); } else { db.prepare('INSERT INTO users (id, username, password, roleId, fullName, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), u, p, '1', u, 1, now); console.log('inserted',u); }"`;
  const fixRes = await exec(conn, fixCmd);
  process.stdout.write(fixRes.out);
  if (fixRes.code !== 0) {
    process.stderr.write(fixRes.err);
    conn.end();
    process.exit(1);
  }

  const verifyCmd =
    'set -e; cd /home/aknkrds/SymiCRMERP; ' +
    `LOGIN_USERNAME=${shQuote(loginUsername)} LOGIN_PASSWORD=${shQuote(loginPassword)} ` +
    `node -e "const http=require('http'); const data=JSON.stringify({username:process.env.LOGIN_USERNAME,password:process.env.LOGIN_PASSWORD}); const req=http.request({hostname:'127.0.0.1',port:3005,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},(r)=>{let b=''; r.on('data',d=>b+=d); r.on('end',()=>{console.log('status',r.statusCode); console.log(b.slice(0,500));});}); req.on('error',e=>{console.error('http_error',e.message); process.exit(1);}); req.write(data); req.end();"`;
  const verifyRes = await exec(conn, verifyCmd);
  process.stdout.write(verifyRes.out);
  if (verifyRes.code !== 0) {
    process.stderr.write(verifyRes.err);
    conn.end();
    process.exit(1);
  }

  conn.end();
};

main().catch((e) => {
  process.stderr.write((e && e.message) ? e.message : String(e));
  process.stderr.write('\n');
  process.exit(1);
});
