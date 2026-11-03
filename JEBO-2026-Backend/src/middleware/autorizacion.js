const autorizacionService = require('../services/autorizacion.service');
const { ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

/**
 * Guards de RECURSO (docs/modelo-roles.md §5).
 *
 * A diferencia de `requireRole`, estos no se resuelven con una lista de roles:
 * necesitan la fila, el estado y la asignacion. La decision vive en
 * `autorizacion.service`; estos middleware solo extraen el recurso del request y
 * traducen el resultado. Un endpoint de coleccion (sin `:id`) se conforma con el
 * nivel de rol, porque no hay una fila puntual a la que exigirle asignacion: el
 * recorte por fila lo hace el servicio (p. ej. `findMios` filtra por el usuario).
 */

const responderConError = (err, next) => next(err);

/**
 * SuperAdmin/Admin operan cualquier partido. Un Arbitro, solo el partido donde
 * figura en el staff. En la coleccion (`/matches/mios`, sin id) alcanza con ser
 * uno de los tres roles.
 */
const operarPartido = async (req, _res, next) => {
  try {
    const idPartido = req.params.id;
    if (!idPartido) {
      const rol = req.user && req.user.rol;
      if (![ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.ARBITRO].includes(rol)) {
        throw new ForbiddenError('Se requiere rol: SuperAdmin, Administrador, Arbitro');
      }
      return next();
    }

    await autorizacionService.assertOperarPartido(req.user, idPartido);
    next();
  } catch (err) {
    responderConError(err, next);
  }
};

/**
 * Ciclo de vida de la presentacion (alta, edicion, estado, resultado). Es
 * administracion de la competencia: SuperAdmin o Admin. El Juez no lo gestiona,
 * solo carga su hoja (`evaluarPresentacion`).
 */
const gestionarPresentacion = async (req, _res, next) => {
  try {
    if (!autorizacionService.esAdministrador(req.user && req.user.rol)) {
      throw new ForbiddenError('Se requiere rol: SuperAdmin, Administrador');
    }
    next();
  } catch (err) {
    responderConError(err, next);
  }
};

/**
 * Leer/guardar una hoja de evaluacion. Admin siempre; Juez solo en el jurado de
 * ESA presentacion. En las escrituras (no-GET) tambien exige `EN_CURSO`.
 */
const evaluarPresentacion = async (req, _res, next) => {
  try {
    const idPresentacion = req.params.id;
    if (!idPresentacion) {
      const rol = req.user && req.user.rol;
      if (![ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.JUEZ].includes(rol)) {
        throw new ForbiddenError('Se requiere rol: SuperAdmin, Administrador, Juez');
      }
      return next();
    }

    await autorizacionService.assertEvaluarPresentacion(req.user, idPresentacion, {
      // Una lectura puede ser sobre una presentacion ya finalizada (para ver la

      exigirEnCurso: req.method !== 'GET'
    });
    next();
  } catch (err) {
    responderConError(err, next);
  }
};

/**
 * Gestionar equipo e inscripciones. Admin siempre; un Profesor solo el equipo
 * que creo. En el alta (sin id) alcanza con ser Profesor: la fila todavia no
 * existe y el creador queda como `id_usuario`, o sea como dueño.
 */
const gestionarEquipoPropio = async (req, _res, next) => {
  try {
    const idEquipo = req.params.id;
    if (!idEquipo) {
      const rol = req.user && req.user.rol;
      if (![ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.PROFESOR].includes(rol)) {
        throw new ForbiddenError('Se requiere rol: SuperAdmin, Administrador, Profesor');
      }
      return next();
    }

    await autorizacionService.assertGestionarEquipoPropio(req.user, idEquipo);
    next();
  } catch (err) {
    responderConError(err, next);
  }
};

module.exports = {
  operarPartido,
  gestionarPresentacion,
  evaluarPresentacion,
  gestionarEquipoPropio
};
