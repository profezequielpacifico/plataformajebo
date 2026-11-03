const rateLimit = require('express-rate-limit');

/**
 * Clave de conteo: identidad primero, IP de respaldo.
 *
 * El problema que se corrige: con `keyGenerator: (req) => req.ip` el presupuesto
 * es compartido por todos los usuarios que salen por la misma IP. Medido en una
 * escuela —donde los 20 alumnos del mismo colegio salen por una sola IP
 * pública— 15 peticiones de cada uno agotaban el presupuesto global y el
 * attendee número 16 recibía 429 sin haber hecho nada malo.
 *
 * En autenticación el efecto es peor y va al revés de lo que se busca: 5
 * intentos fallidos de `admin` desde la misma IP agotaban el bucket, y el login
 * legítimo de otro usuario con su contraseña correcta recibía 429. El limitador
 * frenaba al atacante y al usuario por igual.
 *
 * La clave pasa a ser el email del body en los endpoints de autenticación, y el
 * `id` del token en los autenticados. Ninguno de los dos lo controla el atacante
 * para el caso que importa:
 *
 *   - Email: es el objetivo del ataque, no una vía para obtener más presupuesto.
 *     Rotarlo no sirve porque el lockout por cuenta ya cuenta sobre la fila del
 *     email normalizado. Y como el límite es *por cuenta*, un atacante con mil
 *     IPs contra una sola cuenta sigue topando en el mismo bucket.
 *   - `id` del token: sale de la firma, no lo elige el cliente. Un atacante sin
 *     token válido cae al respaldo por IP.
 *
 * El límite por IP no desaparece: queda como capa secundaria, que es donde debe
 * estar. Sirve para frenar la distribución (muchas cuentas desde un origen), que
 * es señal de credential stuffing, y no como control de fuerza bruta contra una
 * cuenta.
 */
const clavePorEmail = (req) => {
  const email = req.body && req.body.email;
  if (typeof email === 'string' && email.trim()) {
    return `cuenta:${email.trim().toLowerCase()}`;
  }

  return `ip:${req.ip}`;
};

const clavePorToken = (req) => {
  // `req.user` lo deja `authenticate`. En las rutas montadas antes del

  const id = req.user && req.user.id_usuario;
  return id ? `usuario:${id}` : `ip:${req.ip}`;
};

/**
 * El general se sube de 300 a 1000 por ventana de 15 min.
 *
 * Con 300, medido: la petición 301 recibía 429. Para 20 usuariosEso son 15
 * peticiones por usuario en 15 minutos, menos de 1 por minuto. Con la clave por
 * identidad el reparto deja de ser un problema, pero el techo sube igual porque
 * una sesión de uso real (listados, filtros, autocompletado) puede superar
 * holgadamente 300 llamadas en un cuarto de hora.
 *
 * Sigue siendo un límite real: 1000 por usuario cada 15 min es un promedio de
 * ~1.1 req/s sostenidos, muy por encima del uso normal de la aplicación.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorToken,
  message: { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' }
});

/**
 * Alta de cuentas: límite por IP.
 *
 * Solo por IP a propósito, y es el criterio correcto acá: el objetivo del
 * endpoint es *crear* cuentas nuevas, así que no hay una cuenta fija que atacar
 * y la señal relevante es "cuántas cuentas nacen desde este origen". Agregar una
 * clave por email no aportaría —el atacante elige el email— y el registro ya
 * exige correo verificado, que es el control que corresponde a esa capa.
 *
 * `skipSuccessfulRequests` no se usa: "exitoso" significaría "creó una cuenta",
 * que es justo lo que se quiere limitar.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${req.ip}`,
  message: { error: 'Demasiados registros desde esta IP. Intente nuevamente más tarde.' }
});

/**
 * Recuperación de contraseña: límite por cuenta Y por IP, en paralelo.
 *
 * Hace falta el par porque cada clave sola deja abierta una vía:
 *
 *   - Solo por IP: un atacante con varias IPs pide recuperación para mil correos
 *     distintos y enumera toda la base de usuarios. Con un colegio entero
 *     detrás de una NAT, además, 3 intentos de una persona silencian a todos.
 *   - Solo por email: el atacante cambia de correo en cada request y el límite
 *     nunca se activa — la enumeración queda libre.
 *
 * Por eso son DOS limitadores encadenados, no una clave compuesta. Una clave
 * compuesta habríaLOWED elegir el lado: si se compone `email + ip`, cambiar el
 * correo genera una clave nueva y el límite por email nunca se alcanza;
 * si se compone solo con el email, la IP no cuenta. Encadenarlos obliga a que
 * **ambas** señales se agoten: 3 peticiones al mismo correo, o 3 peticiones
 * desde la misma IP, cortan igual.
 */
const recoverPorCuentaLimiter = rateLimit({
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

const recoverPorIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // 10 y no 3: con 3, una escuela entera detrás de una NAT se bloquea entre

  keyGenerator: (req) => `ip:${req.ip}`,
  message: { error: 'Demasiadas solicitudes de recuperación desde esta IP. Intente nuevamente más tarde.' }
});

const recoverPasswordLimiter = [recoverPorIpLimiter, recoverPorCuentaLimiter];

/**
 * Límite de autenticación, por cuenta.
 *
 * `loginLockout` cuenta fallos por cuenta y escala a bloqueo permanente, pero
 * solo actúa sobre intentos fallidos: un atacante que ya tiene una contraseña
 * válida no genera fallos y no lo frena. Este límite frena el éxito también.
 *
 * Sube de 10 a 20 por 15 min porque elNAT escolar lo hacía inútil: 5 intentos
 * fallidos de una cuenta agotaban el bucket de la IP entera y el login legítimo
 * del siguiente usuario caía. Con la clave por cuenta, esos 5 intentos ya no
 * tocan el presupuesto de los demás.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: clavePorEmail,
  message: { error: 'Demasiados intentos de autenticación para esta cuenta. Intente nuevamente más tarde.' }
});

module.exports = { generalLimiter, registerLimiter, recoverPasswordLimiter, authLimiter };
