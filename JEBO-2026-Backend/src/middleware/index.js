const errorHandler = require('./error');
// Este barril es la unica forma de declarar "que guards existen": si un guard

const {
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireAdminOrAbove
} = require('./auth');
const { validate } = require('./validation');
const {
  operarPartido,
  gestionarPresentacion,
  evaluarPresentacion,
  gestionarEquipoPropio
} = require('./autorizacion');
const { generalLimiter, registerLimiter, recoverPasswordLimiter, authLimiter } = require('./rate-limit');
const loginLockout = require('./login-lockout');
const { verificarContenido } = require('./verificar-contenido');

module.exports = {
  errorHandler,
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireAdminOrAbove,
  // Guards de recurso (rol + fila + estado + asignacion), F1.3.
  operarPartido,
  gestionarPresentacion,
  evaluarPresentacion,
  gestionarEquipoPropio,
  validate,
  generalLimiter,
  registerLimiter,
  recoverPasswordLimiter,
  authLimiter,
  loginLockout,
  verificarContenido
};
