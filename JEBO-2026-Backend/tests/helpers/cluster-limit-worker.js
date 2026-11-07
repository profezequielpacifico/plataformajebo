const cluster = require('cluster');
const { ClusterMemoryStorePrimary } = require('@express-rate-limit/cluster-memory-store');

if (cluster.isPrimary) {
  new ClusterMemoryStorePrimary().init();
  cluster.fork();
  cluster.fork();
  cluster.on('listening', (_worker, address) => {
    process.stdout.write(`PORT:${address.port}\n`);
  });
  process.on('SIGTERM', () => {
    for (const worker of Object.values(cluster.workers)) worker.process.kill('SIGKILL');
    process.exit(0);
  });
} else {
  const express = require('express');
  const { authLimiter } = require('../../src/middleware/rate-limit');
  const app = express();
  app.set('trust proxy', 0);
  app.use(express.json());
  app.post('/', authLimiter, (_req, res) => res.json({ pid: process.pid }));
  app.listen(0, '127.0.0.1');
}
