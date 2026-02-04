
import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Backup DB, discard local changes (to allow pull), pull, restore DB, build, restart
  const cmd = 'cd SymiCRMERP && cp crm.db crm.db.backup_$(date +%s) && git checkout . && git pull && mv crm.db.backup_$(date +%s) crm.db && npm install && npm run build && pm2 restart all';
  // Simplified logic: copy current DB to safe place, reset to allow pull, pull, then put back the safe DB over the pulled one
  // Note: we use a fixed name for the restore command to match the backup command in the same shell session?
  // Easier: 
  const safeCmd = 'cd SymiCRMERP && cp crm.db crm.db.temp_safe && git checkout . && git pull && mv crm.db.temp_safe crm.db && npm install && npm run build && pm2 restart all';
  console.log('Executing: ' + safeCmd);
  
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
  host: '78.188.54.69',
  port: 2121,
  username: 'aknkrds',
  password: 'DorukNaz2010'
});
