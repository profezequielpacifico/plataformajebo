const { HTTP_STATUS } = require('../constants');
const loginLockout = require('../middleware/login-lockout');
const bitacoraService = require('../services/bitacora.service');
const { formatResponse, looksLikeEmail, bindAll } = require('../utils');

class LoginLockoutController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async listar(req, res, next) {
    try {
      const data = await loginLockout.listar();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async desbloquear(req, res, next) {
    try {
      const objetivo = String(req.params.ip || '').trim();
      const esCuenta = looksLikeEmail(objetivo);
      const ctx = this._context(req);

      const affected = esCuenta
        ? await loginLockout.limpiarPorIdentificador(objetivo.toLowerCase())
        : await loginLockout.limpiarPorIp(objetivo);

      await bitacoraService.log({
        userId: ctx.userId,
        action: 'DESBLOQUEAR_LOGIN',
        entity: 'Login',
        detail: esCuenta ? { identificador: objetivo } : { ip: objetivo },
        ip: ctx.ip,
        userAgent: ctx.userAgent
      });

      res.status(HTTP_STATUS.OK).json(
        formatResponse(
          { affected, alcance: esCuenta ? 'cuenta' : 'ip' },
          esCuenta ? 'Bloqueo de cuenta levantado' : 'Bloqueo de IP levantado'
        )
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LoginLockoutController();