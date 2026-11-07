const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('./env');

const ALGORITHM = 'HS256';

const TIPO_ACCESS = 'access';
const TIPO_REFRESH = 'refresh';

const firmar = (payload, expiresIn, tipo) =>
  jwt.sign({ ...payload, type: tipo }, env.jwt.secret, {
    expiresIn,
    algorithm: ALGORITHM,
    jwtid: crypto.randomUUID()
  });

const signAccessToken = (payload) => firmar(payload, env.jwt.expiresIn, TIPO_ACCESS);

const signRefreshToken = (payload) => firmar(payload, env.jwt.refreshExpiresIn, TIPO_REFRESH);

const verifyToken = (token) =>
  jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITHM] });

const verifyTokenDeTipo = (token, tipo) => {
  const decoded = verifyToken(token);
  if (decoded.type !== tipo) {
    const err = new Error(`Token de tipo "${decoded.type || 'sin tipo'}" donde se esperaba "${tipo}"`);
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
};

const expiracionDe = (token) => {
  const decoded = jwt.decode(token);
  return decoded && typeof decoded.exp === 'number' ? decoded.exp : null;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  verifyTokenDeTipo,
  expiracionDe,
  TIPO_ACCESS,
  TIPO_REFRESH
};
