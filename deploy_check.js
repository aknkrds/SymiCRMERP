
import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('ls -F SymiCRMERP', (err, stream) => {
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
  host: '192.168.1.100',
  port: 2121,
  username: 'aknkrds',
  password: 'DorukNaz2010',
  // algorithms: { serverHostKey: ['ssh-rsa', 'ssh-dss'] } // Sometimes needed for older servers, but try default first
});
