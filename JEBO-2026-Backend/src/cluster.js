const cluster = require('cluster');
const path = require('path');
const { ClusterMemoryStorePrimary } = require('@express-rate-limit/cluster-memory-store');
const env = require('./config/env');

const VIDA_MINIMA_MS = 10000;
const MAX_CAIDAS_SEGUIDAS = 5;

new ClusterMemoryStorePrimary().init();
cluster.setupPrimary({ exec: path.join(__dirname, 'app.js') });

const nacimientos = new Map();
let caidasSeguidas = 0;
let cerrando = false;

const lanzar = () => {
  const worker = cluster.fork();
  nacimientos.set(worker.id, Date.now());
};

cluster.on('exit', (worker, code, signal) => {
  const vida = Date.now() - nacimientos.get(worker.id);
  nacimientos.delete(worker.id);

  if (cerrando) {
    if (nacimientos.size === 0) process.exit(0);
    return;
  }

  console.error(`Worker ${worker.process.pid} terminó (code=${code}, signal=${signal})`);
  caidasSeguidas = vida < VIDA_MINIMA_MS ? caidasSeguidas + 1 : 0;
  if (caidasSeguidas >= MAX_CAIDAS_SEGUIDAS) {
    console.error('Los workers no logran mantenerse en pie; se detiene el proceso');
    process.exit(1);
  }
  lanzar();
});

const cerrar = () => {
  cerrando = true;
  for (const worker of Object.values(cluster.workers)) worker.process.kill('SIGTERM');
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);

for (let i = 0; i < env.web.concurrency; i += 1) lanzar();
