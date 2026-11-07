const { HTTP_STATUS } = require('../constants');
const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const loginLockout = require('../middleware/login-lockout');
const { formatResponse, bindAll } = require('../utils');
const { UnauthorizedError } = require('../utils/errors');
const env = require('../config/env');

const OpcionesCookie = (maxAge) => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: '/',
  maxAge
});

const COOKIE_REFRESH = () => OpcionesCookie(env.cookie.refreshMaxAge);
const COOKIE_ACCESS = () => OpcionesCookie(env.cookie.accessMaxAge);

const COOKIE_REFRESH_BORRADA = () => ({ ...OpcionesCookie(0), maxAge: 0 });
const COOKIE_ACCESS_BORRADA = () => ({ ...OpcionesCookie(0), maxAge: 0 });

class AuthController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async login(req, res, next) {

    const email = req.body && req.body.email;
    try {
      const { password } = req.body;
      const result = await authService.login(email, password, this._context(req));
      await loginLockout.limpiarEstado(email, req.ip);

      res.cookie('accessToken', result.accessToken, COOKIE_ACCESS());
      res.cookie('refreshToken', result.refreshToken, COOKIE_REFRESH());

      res.status(HTTP_STATUS.OK).json(formatResponse({ user: result.user }, 'Login exitoso'));
    } catch (err) {
      if (err.isOperational && Number(err.statusCode) === HTTP_STATUS.UNAUTHORIZED) {
        await loginLockout.registroFallo(email, req.ip);
      }
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies && req.cookies.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError('Sesión no encontrada. Inicie sesión nuevamente.');
      }
      const result = await authService.refresh(refreshToken);

      res.cookie('accessToken', result.accessToken, COOKIE_ACCESS());
      res.cookie('refreshToken', result.refreshToken, COOKIE_REFRESH());

      res.status(HTTP_STATUS.OK).json(formatResponse({ user: result.user }, 'Sesión renovada'));
    } catch (err) {

      res.clearCookie('accessToken', COOKIE_ACCESS_BORRADA());
      res.clearCookie('refreshToken', COOKIE_REFRESH_BORRADA());
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies && req.cookies.refreshToken;

      const userId = req.user && req.user.id ? req.user.id : this._idDesdeRefresh(refreshToken);
      await authService.logout(refreshToken, userId);

      res.clearCookie('accessToken', COOKIE_ACCESS_BORRADA());
      res.clearCookie('refreshToken', COOKIE_REFRESH_BORRADA());
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Sesión cerrada exitosamente'));
    } catch (err) {
      next(err);
    }
  }

  _idDesdeRefresh(refreshToken) {
    if (!refreshToken) return null;
    try {
      const claims = jwt.decode(refreshToken);
      return claims && claims.id ? claims.id : null;
    } catch (_) {
      return null;
    }
  }

  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(user));
    } catch (err) {
      next(err);
    }
  }

  async recoverPassword(req, res, next) {
    try {
      const { email } = req.body;
      await authService.recoverPassword(email, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña'));
    } catch (err) {
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const userData = req.body;
      const result = await authService.register(userData, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(result, 'Usuario registrado exitosamente'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
