const { verifyTokenDeTipo, TIPO_ACCESS } = require('../config/jwt');
const tokenRevocacion = require('../services/tokenRevocacion.service');
const alcanceService = require('../services/alcance.service');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

/**
 * Autentica y exige que el token sea un access token.
 *
 * Dos controles que no están en `verifyToken` a propósito, para que no se puedan
 * saltar por usar el helper equivocado en un endpoint nuevo:
 *
 *  1. `verifyTokenDeTipo`: un refresh token dura 7 días y el access 1 hora. Sin
 *     esta comprobación, pedir `/auth/refresh` y pegar el resultado donde se
 *     espera un access token convierte una sesión de 1 hora en una de 7 días.
 *  2. `estaRevocado`: para que `logout` deje de ser decorativo. Se consulta
 *     recién después de validar la firma, así que solo se toca la base con
 *     tokens que ya son imposibles de falsificar.
 *
 * El chequeo de revocación es `async`, así que el middleware también. Todos los
 * handlers ya son asíncronos y Express 4 propaga el rechazo con `next`, así que
 * el cambio no altera el contrato de los que ya existían.
 */
const authenticate = async (req, _res, next) => {
  // El access token llega en la cookie `httpOnly`, no en el header. Leer la
  // cookie es lo que hace que el token no sea accesible desde JavaScript: un
  // XSS deja de alcanzar la credencial. El header sigue aceptándose porque hay
  // clientes que no son navegador (smoke tests con curl, Postman) y porque
  // mientras coexistan ambos caminos el riesgo es que alguien se acostumbre a
  // mandar el header y vuelva a exponer el token en el cliente.
  const header = req.headers.authorization;
  const desdeHeader = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const token = desdeHeader || (req.cookies && req.cookies.accessToken);

  if (!token) {
    return next(new UnauthorizedError('Token no proporcionado'));
  }

  try {
    const decoded = verifyTokenDeTipo(token, TIPO_ACCESS);

    if (await tokenRevocacion.estaRevocado(decoded.jti)) {
      return next(new UnauthorizedError('Sesión cerrada. Inicie sesión nuevamente.'));
    }

    // El token viaja con `id`. Se expone tambien como `id_usuario` para que
    // ningun consumidor pueda leer un undefined y perder el actor en la bitacora
    // de auditoria.
    req.user = { ...decoded, id_usuario: decoded.id };
    // Se guarda el token crudo para que `logout` pueda revocar exactamente este
    // refresh. Sin esto el logout solo podría invalidar "todos" del usuario.
    req.token = token;

    // Alcance de institución (X-05). Se resuelve acá, y no en un middleware
    // aparte que haya que acordarse de agregar, porque un endpoint de lectura
    // nuevo que se olvide de incluirlo se leería sin filtro: el fallo sería
    // silencioso y sería una fuga. Con el alcance en `req`, los controladores lo
    // pasan al repositorio, y `alcance.service` lanza si un repositorio de
    // lectura lo recibe sin resolver (invariante 3 de ese módulo).
    //
    // Para Administrador y Árbitro `resolver` no toca la base: son globales por
    // rol. Solo un Profesor paga la lectura de `usuario_institucion`.
    //
    // El rol sale del token, igual que en `requireRole`, y tiene la misma
    // ventana de obsolescencia: hasta 1 hora si a un Administrador le bajan el
    // rol sin subirle `token_version`. Es la misma decisión que ya acepta el
    // resto de la autorización por rol, y por eso el atajo de emergencia sigue
    // siendo subir `token_version`.
    //
    // F1.5 cerró esa ventana para todo lo que se cambia desde la aplicación:
    // `usuario.service.update` sube `token_version` en el mismo `UPDATE` que
    // escribe el rol o el estado, así que degradar o desactivar a alguien no
    // sobrevive en ningún token ya emitido. Lo que queda es el residuo de los
    // tokens emitidos antes de que ese código existiera, que vence solo.
    req.alcance = await alcanceService.resolver(req.user);

    next();
  } catch (err) {
    return next(new UnauthorizedError('Token inválido o expirado'));
  }
};

const requireRole = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('No autenticado'));
    }

    const userRole = req.user.rol || req.user.role;
    if (!roles.includes(userRole)) {
      return next(new ForbiddenError(`Se requiere rol: ${roles.join(', ')}`));
    }

    next();
  };
};

// =============================================================================
// Guards del modelo de roles (docs/modelo-roles.md)
//
// Los guards "de nivel" son un `requireRole` con la lista de roles que alcanza.
// Los guards "de recurso" no: necesitan rol + fila + estado + asignacion, asi que
// no se pueden resolver con una comparacion de rol y por eso viven mas abajo.
// =============================================================================

/**
 * SuperAdmin: administracion del sistema. Usuarios, geografia, seguridad y
 * auditoria. No administra la competencia: para eso esta `requireAdminOrAbove`,
 * que SuperAdmin tambien satisface.
 */
const requireSuperAdmin = requireRole(ROLES.SUPERADMIN);

/**
 * Administracion de la competencia: torneos, etapas, equipos, inscripciones,
 * partidos, presentaciones, canchas, deportes, instituciones, instancias.
 *
 * SuperAdmin entra por herencia, no por caso explicito: administra todo lo que
 * administra el Admin, mas lo suyo. Es lo que hace que agregar un campo a esta
 * lista no requiera acordarse de sumar SuperAdmin en ningun lado, que es
 * exactamente el error que hacia inexplicable a `requireEditorOrAbove`.
 *
 * Reemplaza a `requireEditorOrAbove`, que era identico a `requireAdmin` desde
 * que la migracion `20260907115000_eliminar_roles_extra` borro el rol `Editor` de
 * la tabla: el nombre promovia un nivel que no existia. Y reemplaza tambien a
 * `requireAdmin`, que era identico salvo por no dejar entrar a SuperAdmin: con el
 * nombre viejo, el dia que exista una cuenta SuperAdmin, un endpoint que quedo
 * en `requireAdmin` la habria rechazado. Por eso el cambio no era cosmetico.
 */
const requireAdminOrAbove = requireRole(ROLES.SUPERADMIN, ROLES.ADMIN);

module.exports = {
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireAdminOrAbove
};
