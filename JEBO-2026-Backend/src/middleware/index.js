const errorHandler = require('./error');

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
const { generalLimiter, registerLimiter, recoverPasswordLimiter, authLimiter, sessionLimiter } = require('./rate-limit');
const loginLockout = require('./login-lockout');
const { verificarContenido } = require('./verificar-contenido');

module.exports = {
  errorHandler,
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireAdminOrAbove,
  operarPartido,
  gestionarPresentacion,
  evaluarPresentacion,
  gestionarEquipoPropio,
  validate,
  generalLimiter,
  registerLimiter,
  recoverPasswordLimiter,
  authLimiter,
  sessionLimiter,
  loginLockout,
  verificarContenido
};
