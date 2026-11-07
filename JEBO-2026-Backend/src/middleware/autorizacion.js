const autorizacionService = require('../services/autorizacion.service');
const { ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

const responderConError = (err, next) => next(err);

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

      exigirEnCurso: req.method !== 'GET'
    });
    next();
  } catch (err) {
    responderConError(err, next);
  }
};

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
