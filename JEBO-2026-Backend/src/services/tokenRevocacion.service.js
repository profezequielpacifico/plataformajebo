const knex = require('../config/knex');

const revocadosConocidos = new Set();
const versionesConocidas = new Map();

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

  revocadosConocidos.add(jti);
  return true;
};

const estaRevocado = async (jti) => {
  if (!jti) return false;
  if (revocadosConocidos.has(jti)) return true;

  const fila = await knex('refresh_token_revocado').where({ jti }).first('jti');
  if (fila) revocadosConocidos.add(jti);
  return !!fila;
};

const recordarVersion = (idUsuario, version) => {
  if (typeof version !== 'number') return;
  const previa = versionesConocidas.get(idUsuario);
  if (previa === undefined || version > previa) versionesConocidas.set(idUsuario, version);
};

const sesionVigente = async ({ id, jti, ver } = {}) => {
  if (id === undefined || id === null) return false;
  if (jti && revocadosConocidos.has(jti)) return false;

  const conocida = versionesConocidas.get(id);
  if (typeof ver === 'number' && conocida !== undefined && ver < conocida) return false;

  const fila = await knex('usuario')
    .where('id_usuario', id)
    .first(
      'token_version',
      knex.raw('EXISTS (SELECT 1 FROM refresh_token_revocado WHERE jti = ?) AS revocado', [jti || null])
    );

  if (!fila) return false;
  recordarVersion(id, fila.token_version);

  if (fila.revocado) {
    if (jti) revocadosConocidos.add(jti);
    return false;
  }

  return ver === undefined || ver === fila.token_version;
};

const antiguedadDeRevocacion = async (jti) => {
  if (!jti) return null;

  const fila = await knex('refresh_token_revocado')
    .where({ jti })
    .first('revocado_en');

  if (!fila || !fila.revocado_en) return null;
  return Date.now() - new Date(fila.revocado_en).getTime();
};

const invalidarTodo = (idUsuario) =>
  knex('usuario')
    .where('id_usuario', idUsuario)
    .update({ token_version: knex.raw('COALESCE(token_version, 1) + 1') });

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

setInterval(async () => {
  try {
    await knex('refresh_token_revocado').where('expira_en', '<', knex.fn.now()).del();
    revocadosConocidos.clear();
  } catch (_) { }
}, 6 * 60 * 60 * 1000).unref();

module.exports = { revocar, estaRevocado, sesionVigente, invalidarTodo, antiguedadDeRevocacion, leerJti, leerExp };
