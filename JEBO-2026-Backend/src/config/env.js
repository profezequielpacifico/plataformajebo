require('dotenv').config();

const SECRETOS_DEBILES = new Set([
  'change_me_in_production',
  'default_secret_change_me',
  'secret',
  'changeme',
  'test_secret_key'
]);

const MINIMO_BYTES_SECRETO = 32;

const exigirSecreto = (valor, nombre) => {
  if (!valor || !valor.trim()) {
    throw new Error(
      `[config] ${nombre} no esta definido. La aplicacion no arranca con un secreto por defecto: ` +
      `genera uno con "npm run secret" y exportalo, o agregalo a tu .env.`
    );
  }

  if (SECRETOS_DEBILES.has(valor)) {
    throw new Error(
      `[config] ${nombre} tiene un valor por defecto conocido ("${valor}"). ` +
      `Con ese valor cualquiera puede firmar su propio token, incluido de Administrador. ` +
      `Genera uno con "npm run secret".`
    );
  }

  if (Buffer.byteLength(valor, 'utf8') < MINIMO_BYTES_SECRETO) {
    throw new Error(
      `[config] ${nombre} debe tener al menos ${MINIMO_BYTES_SECRETO} bytes ` +
      `(tiene ${Buffer.byteLength(valor, 'utf8')}). Genera uno con "npm run secret".`
    );
  }

  return valor;
};

const resolverTrustProxy = (bruto) => {
  if (bruto === undefined) return 0;
  const comoNumero = Number(bruto);
  return Number.isNaN(comoNumero) ? bruto : comoNumero;
};

const duracionAMilisegundos = (valor) => {
  const coincidencia = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(String(valor).trim());
  if (!coincidencia) return null;
  const cantidad = Number(coincidencia[1]);
  const factor = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[
    (coincidencia[2] || 'ms').toLowerCase()
  ];
  return cantidad * factor;
};

const enteroPositivo = (valor) => {
  const numero = parseInt(valor, 10);
  return numero > 0 ? numero : null;
};

const workers = enteroPositivo(process.env.WEB_CONCURRENCY) || 1;

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  web: { concurrency: workers },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'jebo_2026',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    poolMax: Math.max(2, Math.floor((enteroPositivo(process.env.DB_POOL_TOTAL) || 20) / workers)),
    acquireTimeoutMs: enteroPositivo(process.env.DB_ACQUIRE_TIMEOUT_MS) || 5000
  },

  jwt: {

    secret: exigirSecreto(process.env.JWT_SECRET, 'JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  trustProxy: resolverTrustProxy(process.env.TRUST_PROXY),

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12
  },

  cookie: {

    secure: process.env.COOKIE_SECURE === 'true',

    sameSite: 'strict'
  }
};

const accessMaxAge = duracionAMilisegundos(env.jwt.expiresIn) || 3600000;
const refreshMaxAge = duracionAMilisegundos(env.jwt.refreshExpiresIn) || 604800000;
env.cookie.accessMaxAge = Math.max(1000, accessMaxAge - 60000);
env.cookie.refreshMaxAge = Math.max(60000, refreshMaxAge - 300000);

module.exports = env;

module.exports = env;
