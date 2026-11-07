const { verifyTokenDeTipo, TIPO_ACCESS } = require('../config/jwt');
const tokenRevocacion = require('../services/tokenRevocacion.service');
const alcanceService = require('../services/alcance.service');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const { ROLES } = require('../constants');

const authenticate = async (req, _res, next) => {
  const header = req.headers.authorization;
  const desdeHeader = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  const token = desdeHeader || (req.cookies && req.cookies.accessToken);

  if (!token) {
    return next(new UnauthorizedError('Token no proporcionado'));
  }

  let decoded;
  try {
    decoded = verifyTokenDeTipo(token, TIPO_ACCESS);
  } catch (err) {
    return next(new UnauthorizedError('Token inválido o expirado'));
  }

  try {
    if (!(await tokenRevocacion.sesionVigente(decoded))) {
      return next(new UnauthorizedError('Sesión cerrada. Inicie sesión nuevamente.'));
    }

    req.user = { ...decoded, id_usuario: decoded.id };
    req.token = token;

    req.alcance = await alcanceService.resolver(req.user);

    next();
  } catch (err) {
    return next(err);
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

const requireSuperAdmin = requireRole(ROLES.SUPERADMIN);

const requireAdminOrAbove = requireRole(ROLES.SUPERADMIN, ROLES.ADMIN);

module.exports = {
  authenticate,
  requireRole,
  requireSuperAdmin,
  requireAdminOrAbove
};
