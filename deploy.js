
import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  const safeCmd =
    'set -e; ' +
    'cd SymiCRMERP; ' +
    'TS=$(date +%s); ' +
    'BACKUP_DIR=/tmp/symicrm_backup_$TS; ' +
    'mkdir -p $BACKUP_DIR; ' +
    'cp crm.db $BACKUP_DIR/crm.db; ' +
    'tar -czf $BACKUP_DIR/uploads.tgz server/img server/doc 2>/dev/null || true; ' +
    'git fetch --all; ' +
    'git reset --hard origin/main; ' +
    'cp $BACKUP_DIR/crm.db crm.db; ' +
    'tar -xzf $BACKUP_DIR/uploads.tgz -C . 2>/dev/null || true; ' +
    'npm install; ' +
    'npm run build; ' +
    'pm2 restart all';
  console.log('Executing deploy command...');
  
  conn.exec(safeCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: process.env.DEPLOY_HOST,
  port: process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 22,
  username: process.env.DEPLOY_USER,
  password: process.env.DEPLOY_PASSWORD,
  agent: process.env.SSH_AUTH_SOCK
});
