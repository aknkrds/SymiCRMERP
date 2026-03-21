import { Client } from 'ssh2';
import process from 'node:process';

const host = process.env.DEPLOY_HOST || '78.188.54.69';
const port = process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 2121;
const username = process.env.DEPLOY_USER || 'aknkrds';
const password = process.env.DEPLOY_PASSWORD;

if (!password) {
  process.stderr.write('DEPLOY_PASSWORD gerekli.\n');
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

const main = async () => {
  const conn = new Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect({ host, port, username, password });
  });

  const cmds = [
    "set -e; cd /home/aknkrds/SymiCRMERP; echo 'PWD'; pwd; echo 'HEAD'; git rev-parse --short HEAD || true; echo 'PM2'; pm2 list || true",
    "set -e; cd /home/aknkrds/SymiCRMERP; echo 'NODE'; node -v; echo 'SERVER_PORT'; (ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true) | grep -E '(:80|:443|:3005)' || true",
    "set -e; cd /home/aknkrds/SymiCRMERP; node -e \"const Database=require('better-sqlite3'); const db=new Database('crm.db',{readonly:true}); const users=db.prepare('SELECT id,username,isActive,roleId,fullName,createdAt FROM users ORDER BY createdAt ASC').all(); console.log('users_count', users.length); console.log('users_sample', users.slice(0,20)); const roles=db.prepare('SELECT id,name,permissions FROM roles ORDER BY id ASC').all(); const invalid=[]; for(const r of roles){ try{ JSON.parse(r.permissions||'[]'); } catch(e){ invalid.push({id:r.id,name:r.name}); } } console.log('roles_count', roles.length); console.log('roles_invalid_permissions', invalid);\"",
    "set -e; cd /home/aknkrds/SymiCRMERP; node -e \"const http=require('http'); const data=JSON.stringify({username:'admin',password:process.env.TEST_PASSWORD||''}); const req=http.request({hostname:'127.0.0.1',port:3005,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},(r)=>{let b=''; r.on('data',d=>b+=d); r.on('end',()=>{console.log('login_status',r.statusCode); console.log(b.slice(0,500));});}); req.on('error',e=>{console.error('http_error',e.message); process.exit(1);}); req.write(data); req.end();\""
  ];

  for (const cmd of cmds) {
    const r = await exec(conn, cmd);
    process.stdout.write(`\n=== ${cmd} ===\n`);
    process.stdout.write(r.out);
    if (r.err) process.stderr.write(r.err);
    process.stdout.write(`\n[exit ${r.code}]\n`);
  }

  conn.end();
};

main().catch((e) => {
  process.stderr.write((e && e.message) ? e.message : String(e));
  process.stderr.write('\n');
  process.exit(1);
});

