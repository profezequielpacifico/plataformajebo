const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('./env');

// Fijar el algoritmo en ambos lados. `verify` sin `algorithms` acepta que el

const ALGORITHM = 'HS256';

// `type` distingue el par de tokens. Sin esto, un refresh token (7 días) valía

const TIPO_ACCESS = 'access';
const TIPO_REFRESH = 'refresh';

/**
 * `jti` es el identificador único del token, y es lo que la denylist de logout
 * guarda. Se genera con `randomUUID`, no con un contador: el valor no necesita
 * ser secreto (va firmado), pero sí necesita ser irrepetible para que revocar
 * un token no revoke otro.
 */
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

/**
 * Verifica exigiendo el tipo esperado.
 *
 * `verifyToken` solo valida firma y expiración. Si un endpoint `authenticate`
 * aceptara cualquiera de los dos tipos, el refresh token —que vive 7 días— sería
 * un access token de 7 días. La comprobación va acá y no en el middleware para
 * que no se pueda olvidar en un endpoint nuevo: es el default y el
 * `verifyToken` crudo queda exportado solo para el refresh.
 */
const verifyTokenDeTipo = (token, tipo) => {
  const decoded = verifyToken(token);
  if (decoded.type !== tipo) {
    const err = new Error(`Token de tipo "${decoded.type || 'sin tipo'}" donde se esperaba "${tipo}"`);
    err.name = 'JsonWebTokenError';
    throw err;
  }
  return decoded;
};

/**
 * Segundos que le quedan al token, para podar la denylist.
 *
 * `jwt.verify` no expone `exp` de forma confiable cuando el token ya venció, y
 * para la poda solo importa el valor del claim. Se lee sin verificar: es un
 * número que después se compara contra el reloj de la base, y no se usa para
 * autorizar nada.
 */
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
