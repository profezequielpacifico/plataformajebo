const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const pedir = (port) => new Promise((resolve, reject) => {
  const cuerpo = JSON.stringify({ email: 'cuenta-cluster@test.com' });
  const req = http.request({
    port,
    host: '127.0.0.1',
    method: 'POST',
    path: '/',
    agent: false,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(cuerpo) }
  }, (res) => {
    let datos = '';
    res.on('data', (c) => { datos += c; });
    res.on('end', () => resolve({ status: res.statusCode, datos }));
  });
  req.on('error', reject);
  req.end(cuerpo);
});

describe('rate limit compartido entre workers', () => {
  let proceso;
  let port;

  beforeAll(async () => {
    proceso = spawn(process.execPath, [path.join(__dirname, '../helpers/cluster-limit-worker.js')], {
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'inherit']
    });
    port = await new Promise((resolve) => {
      let salida = '';
      proceso.stdout.on('data', (c) => {
        salida += c;
        const m = /PORT:(\d+)/.exec(salida);
        if (m) resolve(Number(m[1]));
      });
    });
  }, 15000);

  afterAll(() => {
    if (proceso) proceso.kill('SIGTERM');
  });

  it('el cupo de 20 se agota entre dos procesos y no 20 por proceso', async () => {
    const respuestas = [];
    for (let i = 0; i < 30; i += 1) respuestas.push(await pedir(port));

    const estados = respuestas.map((r) => r.status);
    expect(estados.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(estados.slice(20).every((s) => s === 429)).toBe(true);

    const pids = new Set(respuestas.slice(0, 20).map((r) => JSON.parse(r.datos).pid));
    expect(pids.size).toBe(2);
  }, 15000);
});
