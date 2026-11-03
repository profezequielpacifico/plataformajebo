require('dotenv').config();

// Secretos que quedaron conocidos y que no deben volver a usarse. Esto no es un

const SECRETOS_DEBILES = new Set([
  'change_me_in_production',
  'default_secret_change_me',
  'secret',
  'changeme',
  'test_secret_key'
]);

// 32 bytes es el minimo de HS256. Un secreto corto no se "endurece" mas adelante:
// si es adivinable, el atacante firma su propio token administrador.
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

// Cuántos proxies hay delante de la app. Con 1 (nginx) Express toma el

const resolverTrustProxy = (bruto) => {
  if (bruto === undefined) return 0;
  const comoNumero = Number(bruto);
  return Number.isNaN(comoNumero) ? bruto : comoNumero;
};

// Convierte un `expiresIn` de jsonwebtoken ("1h", "7d", "30m", "900") a

const duracionAMilisegundos = (valor) => {
  const coincidencia = /^(\d+)\s*(ms|s|m|h|d)?$/i.exec(String(valor).trim());
  if (!coincidencia) return null;
  const cantidad = Number(coincidencia[1]);
  const factor = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }[
    (coincidencia[2] || 'ms').toLowerCase()
  ];
  return cantidad * factor;
};

const env = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'jebo_2026',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },

  jwt: {
    // Sin fallback. Si falta o es débil, el arranque falla acá y no en el

    secret: exigirSecreto(process.env.JWT_SECRET, 'JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  },

  // Cuántos proxies hay delante de la app. Con 1 (nginx) Express toma el

  trustProxy: resolverTrustProxy(process.env.TRUST_PROXY),

  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12
  },

  cookie: {
    // `Secure` obliga a que la cookie viaje solo por HTTPS. La app hoy se

    secure: process.env.COOKIE_SECURE === 'true',

    // `Strict`: la cookie no acompaña a requests originados por otro sitio, asi

    sameSite: 'strict'
  }
};

/**
 * Vida de las cookies, derivada de la vida de los tokens.
 *
 * Si el token dura 7 dias y la cookie 7 dias exactos, hay una carrera entre los
 * dos relojes y el usuario cae de la sesion sin explicacion. Se reparte: la
 * cookie vence un poco antes que el token, de modo que el token es lo unico que
 * manda y la cookie nunca llega viva a un token muerto.
 */
const accessMaxAge = duracionAMilisegundos(env.jwt.expiresIn) || 3600000;
const refreshMaxAge = duracionAMilisegundos(env.jwt.refreshExpiresIn) || 604800000;
env.cookie.accessMaxAge = Math.max(1000, accessMaxAge - 60000);
env.cookie.refreshMaxAge = Math.max(60000, refreshMaxAge - 300000);

module.exports = env;

module.exports = env;
