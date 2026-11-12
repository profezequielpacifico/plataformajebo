const cluster = require('cluster');
const rateLimit = require('express-rate-limit');
const { ClusterMemoryStoreWorker } = require('@express-rate-limit/cluster-memory-store');
const { verifyTokenDeTipo, TIPO_ACCESS, TIPO_REFRESH } = require('../config/jwt');

const limitador = (prefijo, opciones) => rateLimit(
  cluster.isWorker
    ? { ...opciones, store: new ClusterMemoryStoreWorker({ prefix: prefijo }) }
    : opciones
);

const clavePorEmail = (req) => {
  const email = req.body && req.body.email;
  if (typeof email === 'string' && email.trim()) {
    return `cuenta:${email.trim().toLowerCase()}`;
  }

  return `ip:${req.ip}`;
};

const idDelToken = (token, tipo) => {
  if (typeof token !== 'string' || !token) return null;
  try {
    return verifyTokenDeTipo(token, tipo).id || null;
  } catch (_) {
    return null;
  }
};

const tokenDeAcceso = (req) => {
  const header = req.headers && req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.split(' ')[1];
  return req.cookies && req.cookies.accessToken;
};

const identidades = new WeakMap();

const identidadDe = (req) => {
  if (!identidades.has(req)) {
    const acceso = (req.user && req.user.id_usuario) || idDelToken(tokenDeAcceso(req), TIPO_ACCESS);
    const refresh = idDelToken(req.cookies && req.cookies.refreshToken, TIPO_REFRESH);
    identidades.set(req, { acceso, sesion: refresh || acceso });
  }
  return identidades.get(req);
};

const clavePorToken = (req) => {
  const id = identidadDe(req).acceso;
  return id ? `usuario:${id}` : `ip:${req.ip}`;
};

const clavePorSesion = (req) => {
  const id = identidadDe(req).sesion;
  return id ? `usuario:${id}` : `ip:${req.ip}`;
};

const generalLimiter = limitador('general:', {
  windowMs: 15 * 60 * 1000,
  max: (req) => (identidadDe(req).acceso ? 1000 : 3000),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorToken,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' }
});

const registerLimiter = limitador('registro:', {
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip}`,
  message: { error: 'Demasiados registros desde esta IP. Intente nuevamente más tarde.' }
});

const recoverPorCuentaLimiter = limitador('recuperar-cuenta:', {
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body && req.body.email;
    return typeof email === 'string' && email.trim()
      ? `cuenta:${email.trim().toLowerCase()}`
      : `ip:${req.ip}`;
  },
  message: { error: 'Demasiadas solicitudes de recuperación para esta cuenta. Intente nuevamente más tarde.' }
});

const recoverPorIpLimiter = limitador('recuperar-ip:', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => `ip:${req.ip}`,
  message: { error: 'Demasiadas solicitudes de recuperación desde esta IP. Intente nuevamente más tarde.' }
});

const recoverPasswordLimiter = [recoverPorIpLimiter, recoverPorCuentaLimiter];

const authLimiter = limitador('login:', {
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorEmail,
  message: { error: 'Demasiados intentos de autenticación para esta cuenta. Intente nuevamente más tarde.' }
});

const sessionLimiter = limitador('sesion:', {
  windowMs: 15 * 60 * 1000,
  max: (req) => (identidadDe(req).sesion ? 60 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorSesion,
  message: { error: 'Demasiadas operaciones de sesión. Intente nuevamente más tarde.' }
});

const publicLimiter = limitador('publico:', {
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip}`,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' }
});

module.exports = { generalLimiter, registerLimiter, recoverPasswordLimiter, authLimiter, sessionLimiter, publicLimiter };
