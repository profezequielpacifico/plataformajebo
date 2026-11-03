#!/usr/bin/env node
/**
 * Docker container entry: wait for DB → migrate → start API.
 * Pure Node to avoid CRLF issues with shell scripts on Windows checkouts.
 */
const net = require('net');
const { spawn } = require('child_process');

const host = process.env.DB_HOST || 'db';
const port = parseInt(process.env.DB_PORT || '5432', 10);

function waitForPort(retries = 60) {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    const tryConnect = () => {
      attempt += 1;
      const socket = net.connect(port, host, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (attempt >= retries) {
          reject(new Error(`Timeout waiting for ${host}:${port}`));
          return;
        }
        setTimeout(tryConnect, 1000);
      });
    };
    console.log(`Waiting for Postgres at ${host}:${port}...`);
    tryConnect();
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
    });
  });
}

(async () => {
  await waitForPort();
  console.log('Running migrations...');
  await run('node', ['scripts/docker-migrate.js']);
  console.log('Starting API...');
  const child = spawn('node', ['src/app.js'], { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code || 0));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
