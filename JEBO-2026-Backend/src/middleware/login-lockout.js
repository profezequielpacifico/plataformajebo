const knex = require('../config/knex');
const { HTTP_STATUS } = require('../constants');

const MS = 1000;
const UMBRAL_PERMANENTE = 14;
const SENTINEL_CUENTA = '';

const UMBRAL_IP = 20;

const normalizarEmail = (email) =>
  typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

const claveCuenta = (identificador) => ({
  identificador: identificador || null,
  ip: SENTINEL_CUENTA
});

const claveIp = (ip) => ({ identificador: `ip:${ip}`, ip: ip || 'desconocida' });

const _umbralDe = (k) => (k.ip === SENTINEL_CUENTA ? 5 : UMBRAL_IP);

function _etapaDe(intentos, umbral = 5) {
  if (intentos >= umbral + 9) return { indice: 4, permanente: true, minutos: null };
  if (intentos >= umbral + 6) return { indice: 3, permanente: false, minutos: 30 };
  if (intentos >= umbral + 3) return { indice: 2, permanente: false, minutos: 15 };
  if (intentos >= umbral) return { indice: 1, permanente: false, minutos: 5 };
  return { indice: 0, permanente: false, minutos: null };
}

function _mensaje(e) {
  switch (e.indice) {
    case 1: return 'Demasiados intentos de inicio de sesion. Cuenta bloqueada durante 5 minutos.';
    case 2: return 'Demasiados intentos de inicio de sesion. Cuenta bloqueada durante 15 minutos.';
    case 3: return 'Limite de intentos superado. Cuenta bloqueada durante 30 minutos.';
    case 4: return 'Se supero el limite de intentos de inicio de sesion. Comuniquese con el servicio tecnico.';
    default: return null;
  }
}

const _fila = (k) => knex('login_intentos').where(k).first();

function _toEstado(row, umbral = 5) {
  if (!row) return null;
  const base = { failures: row.failures };
  if (row.permanente) {
    return { ...base, bloqueado: true, permanente: true, retryAfterSeconds: null,
      etapa: 4, mensaje: _mensaje(_etapaDe(row.failures, umbral)) };
  }
  if (row.locked_until) {
    const hasta = new Date(row.locked_until).getTime();
    if (hasta > Date.now()) {
      const e = _etapaDe(row.failures, umbral);
      return { ...base, bloqueado: true, permanente: false,
        retryAfterSeconds: Math.ceil((hasta - Date.now()) / MS),
        etapa: e.indice, mensaje: _mensaje(e) };
    }
    return { ...base, bloqueado: false, permanente: false, retryAfterSeconds: null,
      etapa: 0, mensaje: null, expirado: true };
  }
  return { ...base, bloqueado: false, permanente: false, retryAfterSeconds: null,
    etapa: 0, mensaje: null };
}

async function _sumarFallo(k) {
  const raw = await knex('login_intentos')
    .insert({ identificador: k.identificador, ip: k.ip, failures: 1 })
    .onConflict(['identificador', 'ip'])
    .merge({
      failures: knex.raw('login_intentos.failures + 1'),
      actualizado_en: knex.fn.now()
    })
    .returning(['failures', 'locked_until', 'permanente']);

  const row = raw[0];
  const failures = parseInt(row.failures, 10);
  const etapa = _etapaDe(failures, _umbralDe(k));

  if (etapa.permanente && !row.permanente) {
    await knex('login_intentos').where(k)
      .update({ permanente: true, locked_until: null, actualizado_en: knex.fn.now() });
  } else if (etapa.minutos) {
    const prev = row.locked_until ? new Date(row.locked_until).getTime() : 0;
    const hasta = Date.now() + etapa.minutos * 60 * MS;
    if (hasta > prev) {
      await knex('login_intentos').where(k)
        .update({ locked_until: new Date(hasta), actualizado_en: knex.fn.now() });
    }
  }
  return etapa;
}

async function registroFallo(email, ip) {
  const identificador = normalizarEmail(email);
  const etapas = [];
  if (identificador) etapas.push(await _sumarFallo(claveCuenta(identificador)));
  if (ip) etapas.push(await _sumarFallo(claveIp(ip)));
  return etapas.reduce((peor, e) => (e.indice > peor.indice ? e : peor), _etapaDe(0));
}

async function estadoBloqueo(email, ip) {
  const identificador = normalizarEmail(email);
  const porCuenta = identificador ? _toEstado(await _fila(claveCuenta(identificador)), 5) : null;
  const porIp = ip ? _toEstado(await _fila(claveIp(ip)), UMBRAL_IP) : null;

  if (porIp && porIp.bloqueado && (!porCuenta || !porCuenta.bloqueado)) {
    return { ...porIp, alcance: 'ip' };
  }
  if (porCuenta && porCuenta.bloqueado) return { ...porCuenta, alcance: 'cuenta' };

  if (porCuenta) return { ...porCuenta, bloqueado: false, alcance: 'cuenta' };
  if (porIp) return { ...porIp, bloqueado: false, alcance: 'ip' };
  return null;
}

async function limpiarEstado(email, ip) {
  const identificador = normalizarEmail(email);
  if (identificador) await knex('login_intentos').where(claveCuenta(identificador)).del();
}

async function limpiarPorIdentificador(identificador) {
  if (!identificador) return 0;
  const id = String(identificador).trim().toLowerCase();
  return knex('login_intentos')
    .where((q) => q.where({ identificador: id }).orWhere({ identificador: `ip:${id}` }))
    .del();
}

async function limpiarPorIp(ip) {
  if (!ip) return 0;
  return knex('login_intentos').where({ identificador: `ip:${ip}` }).del();
}

async function limpiarTodo() {
  await knex('login_intentos').del();
}

async function listar() {
  const rows = await knex('login_intentos').orderBy('failures', 'desc');
  return rows.map((r) => {

    const e = _toEstado(r, r.ip === SENTINEL_CUENTA ? 5 : UMBRAL_IP);
    return {
      identificador: r.identificador,
      alcance: r.ip === SENTINEL_CUENTA ? 'cuenta' : 'ip',
      ip: r.ip || null,
      failures: r.failures,
      permanente: r.permanente,
      locked_until: r.locked_until ? new Date(r.locked_until).toISOString() : null,
      bloqueado: e ? e.bloqueado : false,
      expirado: e ? !!e.expirado : false,
      retryAfterSeconds: e ? e.retryAfterSeconds : null,
      etapa: e ? e.etapa : 0,
      mensaje: e ? e.mensaje : null
    };
  });
}

async function estado(email, ip) {
  return estadoBloqueo(email, ip);
}

setInterval(async () => {
  try {
    await knex('login_intentos')
      .whereNotNull('locked_until')
      .where('locked_until', '<', knex.fn.now())
      .del();
    await knex('login_intentos')
      .where('permanente', false)
      .whereNull('locked_until')
      .where('actualizado_en', '<', knex.raw("now() - interval '24 hours'"))
      .del();
  } catch (_) { }
}, 30 * 60 * MS).unref();

const loginLockout = async (req, res, next) => {
  try {
    const email = req.body && req.body.email;
    const b = await estadoBloqueo(email, req.ip);
    if (b && b.bloqueado) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
        success: false,
        error: b.mensaje,
        retryAfterSeconds: b.retryAfterSeconds,
        bloqueoPermanente: b.permanente,
        etapa: b.etapa
      });
    }
    next();
  } catch (err) { next(err); }
};

loginLockout.getStatus = async (req, res, next) => {
  try {
    const b = await estadoBloqueo(req.query && req.query.email, req.ip);
    res.json({
      success: true,
      data: b || { bloqueado: false, permanente: false, retryAfterSeconds: null, etapa: 0, mensaje: null }
    });
  } catch (err) { next(err); }
};

loginLockout.normalizarEmail = normalizarEmail;
loginLockout.registroFallo = registroFallo;
loginLockout.estadoBloqueo = estadoBloqueo;
loginLockout.limpiarEstado = limpiarEstado;
loginLockout.limpiarPorIdentificador = limpiarPorIdentificador;
loginLockout.limpiarPorIp = limpiarPorIp;
loginLockout.limpiarTodo = limpiarTodo;
loginLockout.listar = listar;
loginLockout.estado = estado;

module.exports = loginLockout;
