
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

const main = async () => {
  const host = process.env.DEPLOY_HOST || '78.188.54.69';
  const port = process.env.DEPLOY_PORT ? parseInt(process.env.DEPLOY_PORT, 10) : 2121;
  const username = process.env.DEPLOY_USER || 'aknkrds';

  const agent = process.env.SSH_AUTH_SOCK;
  const password = agent ? undefined : (process.env.DEPLOY_PASSWORD || await askHidden('SSH Password: '));

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
  }).connect({
    host,
    port,
    username,
    password,
    agent
  });
};

main();
