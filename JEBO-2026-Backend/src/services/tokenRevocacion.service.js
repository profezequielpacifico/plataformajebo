const knex = require('../config/knex');

/**
 * Denylist de refresh tokens revocados.
 *
 * Por qué denylist y no allowlist: una allowlist obligaría a registrar cada
 * sesión emitida y a consultar la base en cada refresh y en cada request
 * autenticado. La denylist deja el camino caliente (verificar la firma) sin
 * tocar la base, y solo se agrega una fila cuando alguien cierra sesión —que es
 * mucho más raro que iniciar sesión—.
 *
 * La fila se poda sola por `expira_en`: un refresh token venera 7 días, y
 * pasado ese punto nadie puede presentarlo, así que guardarlo no aporta nada.
 */
const TTL_PODA_MS = 5 * 60 * 1000;
const cache = new Map();

/**
 * Revoca un refresh token concreto.
 *
 * Guarda el `jti` junto con el `exp` del propio token, no los 7 días completos
 * desde el logout: si el token venciera en dos horas, la fila sobra en dos
 * horas y no en siete.
 *
 * `onConflict ... ignore` hace la operación idempotente: revocar dos veces el
 * mismo token (doble clic, reintento del cliente) no rompe.
 */
const revocar = async (token, idUsuario) => {
  const jti = leerJti(token);
  const exp = leerExp(token);
  if (!jti || !idUsuario) return false;

  await knex('refresh_token_revocado')
    .insert({
      jti,
      id_usuario: idUsuario,
      revocado_en: knex.fn.now(),
      expira_en: exp ? new Date(exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    })
    .onConflict('jti')
    .ignore();

  cache.delete(jti);
  return true;
};

/**
 * ¿Está este `jti` revocado?
 *
 * El resultado se cachea 30 s. La fila no se borra al vencer su `expira_en`
 * (eso lo hace la poda periódica), así que sin cache cada request autenticado
 * preguntaría por tokens que ya son inútiles.
 */const estaRevocado = async (jti) => {
  if (!jti) return false;

  const cached = cache.get(jti);
  if (cached && Date.now() - cached.tiempo < TTL_PODA_MS) return cached.revocado;

  const fila = await knex('refresh_token_revocado').where({ jti }).first();
  const revocado = !!fila;
  cache.set(jti, { revocado, tiempo: Date.now() });
  return revocado;
};

/**
 * Hace cuanto se revoco este `jti`, en ms, o `null` si no esta revocado.
 *
 * Existe para la ventana de gracia de la rotacion de refresh tokens: con
 * rotacion estricta, dos pestanas del mismo usuario se pisan entre si. Ver
 * `auth.service.refresh`.
 */
const antiguedadDeRevocacion = async (jti) => {
  if (!jti) return null;

  const fila = await knex('refresh_token_revocado')
    .where({ jti })
    .first('revocado_en');

  if (!fila || !fila.revocado_en) return null;
  return Date.now() - new Date(fila.revocado_en).getTime();
};

/**
 * Invalida todos los tokens de un usuario subiendo `token_version`.
 *
 * Es el interruptor de emergencia para cuando un token se filtra y el cliente
 * nunca llama a `logout`: una escritura y quedan muertos todos sus tokens, sin
 * tener que conocer cada `jti`.
 */
const invalidarTodo = (idUsuario) =>
  knex('usuario')
    .where('id_usuario', idUsuario)
    .update({ token_version: knex.raw('COALESCE(token_version, 1) + 1') });

/** Lectura sin verificar firma: el token está firmado por el propio servidor. */
const leerClaims = (token) => {
  const jwt = require('jsonwebtoken');
  return jwt.decode(token) || null;
};

const leerJti = (token) => {
  const claims = leerClaims(token);
  return claims && typeof claims.jti === 'string' ? claims.jti : null;
};

const leerExp = (token) => {
  const claims = leerClaims(token);
  return claims && typeof claims.exp === 'number' ? claims.exp : null;
};

/** Poda. Se corre al arrancar y cada 6 h; los índices cubren ambos filtros. */
setInterval(async () => {
  try {
    await knex('refresh_token_revocado').where('expira_en', '<', knex.fn.now()).del();
  } catch (_) { /* best effort: la poda no debe tumbar el proceso */ }
}, 6 * 60 * 60 * 1000).unref();

module.exports = { revocar, estaRevocado, invalidarTodo, antiguedadDeRevocacion, leerJti, leerExp };
