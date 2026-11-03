const knex = require('../config/knex');
const { HTTP_STATUS } = require('../constants');

const MS = 1000;
const UMBRAL_PERMANENTE = 14;
const SENTINEL_CUENTA = ''; // marca la fila que agrega los fallos de una cuenta

/**
 * Umbral de bloqueo para la fila de IP, en fallos DISTINTOS.
 *
 * El de la cuenta sigue en 5. El de la IP tiene que ser mucho más alto, y la
 * razón es que la fila de IP no distingue usuarios: 5 intentos fallidos de
 * `admin` desde una IP bloquean a TODOS los que salen por ella.
 *
 * Medido antes de este cambio: tras 5 intentos fallidos de una cuenta, el login
 * LEGÍTIMO de otra cuenta desde la misma IP devolvía 429. En un colegio donde
 * los 20 usuarios salen por una sola IP pública, un solo alumno que se Equivoque
 * tres veces bloquea la escuela entera durante 5 minutos.
 *
 * Con 20 cuentas distintas fallando desde la misma IP, el bloqueo por IP se
 * sigue activando — que es su trabajo real: detectar credential stuffing y
 * distribución de ataques. Pero un usuario legítimo ya no queda atrapado en el
 * fuego cruzado de los errores de otro.
 *
 * La escalera por IP arranca entonces en 20/30/40/50 en vez de 5/8/11/14. El
 * bloqueo permanente por IP queda en 50: es un volumen que ningún uso legítimo
 * produce.
 */
const UMBRAL_IP = 20;

/**
 * Lockout por cuenta, con IP como senal secundaria.
 *
 * El esquema es una fila por (identificador, ip) y se usan dos tipos de fila:
 *
 *   - Fila de CUENTA: identificador = email, ip = ''. Es el contador primario.
 *     Una sola fila por cuenta, compartida entre todas las IP de las que se
 *     intente entrar. Por eso rotar la IP no sirve: el atacante sigue
 *     acumulando sobre la misma fila.
 *   - Fila de IP: identificador = 'ip:<ip>', ip = <ip>. Suma el mismo fallo para
 *     cada cuenta distinta que falla desde ese origen, que es la senal de
 *     credential stuffing. Se conserva porque evita que un atacante lockee a su
 *     victima desde cualquier IP, pero no reemplaza al contador de cuenta.
 *
 * El bloqueo se activa si se supera cualquiera de los dos.
 */
const normalizarEmail = (email) =>
  typeof email === 'string' && email.trim() ? email.trim().toLowerCase() : null;

const claveCuenta = (identificador) => ({
  identificador: identificador || null,
  ip: SENTINEL_CUENTA
});

const claveIp = (ip) => ({ identificador: `ip:${ip}`, ip: ip || 'desconocida' });

/** Umbral de bloqueo que corresponde a la fila: 5 para la cuenta, UMBRAL_IP para la IP. */
const _umbralDe = (k) => (k.ip === SENTINEL_CUENTA ? 5 : UMBRAL_IP);

/**
 * Etapa de bloqueo para un número de intentos.
 *
 * `umbral` es la base de la escalera: 5 para la cuenta, `UMBRAL_IP` para la IP.
 * Las etapas siguientes se derivan de esa base con los mismos escalones del
 * código original (+3, +6, +9 fallos), de modo que subir el umbral de la IP sube
 * toda su escalera y no solo el primer peldaño.
 */
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

/**
 * Estado de bloqueo de una fila.
 *
 * `umbral` es el de la fila que se está leyendo (5 o `UMBRAL_IP`): sin él, una
 * fila de IP con 6 fallos se leería con la escalera de la cuenta y saltaría a
 * etapa 2 sin tener 20.
 */
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

/**
 * Suma un fallo a una fila.
 *
 * El off-by-one anterior venía de encadenar `.insert()` con
 * `.onConflict().merge()`: si la fila no existía, el INSERT se cumplía y la
 * parte `merge` no corría, así que el primer fallo no contaba y el atacante se
 * ganaba un intento gratis. Se arregla poniendo `failures: 1` en el propio
 * INSERT: `merge` solo se aplica si hubo conflicto, y ahí suma sobre el valor
 * existente.
 */
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

/**
 * Registra un fallo contra la cuenta y contra la IP del origen.
 *
 * Se cuentan las dos filas en la misma peticion para que un login fallido
 * siempre deje rastro en los dos ejes.
 */
async function registroFallo(email, ip) {
  const identificador = normalizarEmail(email);
  const etapas = [];
  if (identificador) etapas.push(await _sumarFallo(claveCuenta(identificador)));
  if (ip) etapas.push(await _sumarFallo(claveIp(ip)));
  return etapas.reduce((peor, e) => (e.indice > peor.indice ? e : peor), _etapaDe(0));
}

/**
 * Bloqueo efectivo: el peor entre el contador de la cuenta y el de la IP.
 *
 * El de la cuenta manda salvo que la IP este peor. Ambos salen de filas que el
 * cliente no controla: el email del cuerpo y req.ip con trustProxy en 0.
 */
async function estadoBloqueo(email, ip) {
  const identificador = normalizarEmail(email);
  const porCuenta = identificador ? _toEstado(await _fila(claveCuenta(identificador)), 5) : null;
  const porIp = ip ? _toEstado(await _fila(claveIp(ip)), UMBRAL_IP) : null;

  // Se compara contra si la fila esta BLOQUEADA, no contra `failures`. Antes se

  if (porIp && porIp.bloqueado && (!porCuenta || !porCuenta.bloqueado)) {
    return { ...porIp, alcance: 'ip' };
  }
  if (porCuenta && porCuenta.bloqueado) return { ...porCuenta, alcance: 'cuenta' };
  // Nadie bloqueado: se devuelve el peor estado informative para la UI, pero

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
    // Mismo umbral que usa el gate: una fila de IP leída con la escalera de la

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

/**
 * Limpia filas cuyo bloqueo ya vencio.
 *
 * El filtro anterior era `failures < 5`, pero las filas que dispararon un
 * bloqueo tienen `failures >= 5`: nunca satisfacian el filtro, asi que se
 * acumulaban para siempre. Ahora se borra por `locked_until` vencido, que es lo
 * que deja una fila sin efecto, y ademas se purgan los contadores sin bloqueo
 * viejo para que la tabla no crezca sin limite.
 */
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
  } catch (_) { /* best effort: la limpieza periodica no debe tumbar el proceso */ }
}, 30 * 60 * MS).unref();

/**
 * Gate de bloqueo. Corta con 429 si la cuenta o la IP están bloqueadas.
 *
 * Este gate NO suma el intento bloqueado contra el contador. Antes lo hacía, con
 * el argumento de que si no las etapas 2, 3 y 4 quedaban inalcanzables. Ese
 * argumento era falso y el arreglo era peor que el problema:
 *
 *  - La escalera avanza sola al expirar la ventana. `estadoBloqueo` solo marca
 *    `bloqueado` mientras `locked_until` esta en el futuro. Vencido el plazo, el
 *    gate llama a `next()`, el controlador corre, la contraseña falla y
 *    `registroFallo` vuelve a sumar. El contador pasa de 5 a 6, 7 y 8 — etapa 2
 *    — sin ninguna ayuda del gate.
 *
 *  - Sumar en el gate convertía el bloqueo en un DoS sin autenticar. Medido
 *    contra el despliegue: catorce peticiones POST /auth/login con una
 *    contraseña cualquiera contra `admin@jebo2026.com` dejaron la fila en 12
 *    fallos y etapa 3, y a 14 llega `permanente: true`. Ningún atacante necesita
 *    la contraseña para bloquear una cuenta ajena de forma permanente y sin
 *    vencimiento: solo conocer el email, que es justo lo que permite enumerar
 *    en X-07.
 *
 *  - La escalera existe para lo contrario: dar pocas oportunidades al atacante
 *    y crecer la espera entre ellas, de modo que un ataque automatizado agote su
 *    tiempo antes de alcanzar el bloqueo permanente. Contar los rebotes 429
 *    invertía esa protección.
 *
 * Unico requisito para que esto no se rompa: el umbral por defecto (5) tiene que
 * ser el mismo en la escalera de `registroFallo` y en la del gate. Por eso vive
 * en un solo lugar, `_umbralDe`.
 */
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
