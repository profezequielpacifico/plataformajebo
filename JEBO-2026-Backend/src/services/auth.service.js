const bcrypt = require('bcrypt');
const { UsuarioRepository, RolRepository } = require('../repositories');
const { signAccessToken, signRefreshToken } = require('../config/jwt');
const { UnauthorizedError, BusinessError } = require('../utils/errors');
const { normalizarEmail } = require('../utils/validators');
const env = require('../config/env');
const bitacoraService = require('./bitacora.service');
const tokenRevocacion = require('./tokenRevocacion.service');

class AuthService {
  async login(email, password, context = {}) {

    const correo = normalizarEmail(email);

    const user = await UsuarioRepository.findByEmailConHash(correo);
    if (!user) {
      await bitacoraService.log({
        action: 'INTENTO_FALLIDO', entity: 'Usuario', detail: { email: correo },
        ip: context.ip, userAgent: context.userAgent, result: 'fallido'
      });
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (user.estado !== 'Activo') {

      await bitacoraService.log({
        userId: user.id_usuario, action: 'INTENTO_FALLIDO', entity: 'Usuario',
        entityId: user.id_usuario, detail: { motivo: 'Usuario inactivo' },
        ip: context.ip, userAgent: context.userAgent, result: 'fallido'
      });
      throw new UnauthorizedError('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await bitacoraService.log({
        userId: user.id_usuario, action: 'INTENTO_FALLIDO', entity: 'Usuario',
        entityId: user.id_usuario, detail: { motivo: 'Contraseña incorrecta' },
        ip: context.ip, userAgent: context.userAgent, result: 'fallido'
      });
      throw new UnauthorizedError('Credenciales inválidas');
    }

    await UsuarioRepository.updateLastAccess(user.id_usuario);

    await bitacoraService.log({
      userId: user.id_usuario, action: 'INICIO_SESION', entity: 'Usuario',
      entityId: user.id_usuario, ip: context.ip, userAgent: context.userAgent
    });

    const payload = {
      id: user.id_usuario,
      nombre: user.nombre,
      id_rol: user.id_rol,
      rol: user.rol_descripcion,
      ver: user.token_version
    };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return {
      user: {
        id_usuario: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol_descripcion,
        id_rol: user.id_rol
      },
      accessToken,
      refreshToken
    };
  }

  async refresh(token) {
    const { verifyTokenDeTipo, TIPO_REFRESH } = require('../config/jwt');

    const VENTANA_DE_GRACIA_MS = 30 * 1000;

    try {

      const decoded = verifyTokenDeTipo(token, TIPO_REFRESH);

      if (await tokenRevocacion.estaRevocado(decoded.jti)) {

        const antiguedad = await tokenRevocacion.antiguedadDeRevocacion(decoded.jti);
        if (antiguedad === null || antiguedad > VENTANA_DE_GRACIA_MS) {
          throw new UnauthorizedError('Sesión cerrada. Inicie sesión nuevamente.');
        }
      }

      const user = await UsuarioRepository.findById(decoded.id, {
        alcance: { global: true },
        solicitanteId: decoded.id
      });
      if (!user || user.estado !== 'Activo') {
        throw new UnauthorizedError('Usuario no válido');
      }

      if (decoded.ver !== undefined && user.token_version !== undefined
          && decoded.ver !== user.token_version) {
        throw new UnauthorizedError('Sesión cerrada. Inicie sesión nuevamente.');
      }

      const payload = {
        id: user.id_usuario,
        nombre: user.nombre,
        id_rol: user.id_rol,
        rol: user.rol_descripcion,
        ver: user.token_version
      };
      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await tokenRevocacion.revocar(token, user.id_usuario);

      return {
        user: {
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol_descripcion,
          id_rol: user.id_rol
        },
        accessToken,
        refreshToken
      };
    } catch (err) {
      if (err.isOperational) throw err;
      throw new UnauthorizedError('Token inválido o expirado');
    }
  }

  async logout(refreshToken, userId) {
    if (refreshToken) {
      try {
        await tokenRevocacion.revocar(refreshToken, userId);

        if (userId) {
          await tokenRevocacion.invalidarTodo(userId);
        }
      } catch (err) {

        await bitacoraService.log({
          userId, action: 'LOGOUT_SIN_REVOCAR', entity: 'Usuario', entityId: userId,
          detail: { motivo: err.message }
        });
      }
    }
    return { message: 'Sesión cerrada exitosamente' };
  }

  async getCurrentUser(userId) {
    const user = await UsuarioRepository.findById(userId, {
      alcance: { global: true },
      solicitanteId: userId
    });
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }
    return user;
  }

  async recoverPassword(email, context = {}) {
    const correo = normalizarEmail(email);
    const user = await UsuarioRepository.findByEmail(correo);
    await bitacoraService.log({
      action: 'RECUPERAR_CONTRASENA', entity: 'Usuario',
      entityId: user?.id_usuario || null, detail: { email: correo },
      ip: context.ip, userAgent: context.userAgent
    });
    if (!user) {
      return { message: 'Si el correo existe, recibirás instrucciones' };
    }
    return { message: 'Si el correo existe, recibirás instrucciones' };
  }

  async register(data, context = {}) {

    data.email = normalizarEmail(data.email);

    const existingEmail = await UsuarioRepository.findByEmail(data.email);
    if (existingEmail) {
      await bitacoraService.log({
        action: 'REGISTRO_FALLIDO', entity: 'Usuario', detail: { email: data.email, motivo: 'Email ya existe' },
        ip: context.ip, userAgent: context.userAgent, result: 'fallido'
      });
      throw new BusinessError('El email ya existe');
    }

    const existingDoc = await UsuarioRepository.findByDocumento(data.documento);
    if (existingDoc) {
      await bitacoraService.log({
        action: 'REGISTRO_FALLIDO', entity: 'Usuario', detail: { email: data.email, motivo: 'Documento ya registrado' },
        ip: context.ip, userAgent: context.userAgent, result: 'fallido'
      });
      throw new BusinessError('El documento ya está registrado');
    }

    const rol = await RolRepository.findByDescripcion('Profesor');
    const password_hash = await bcrypt.hash(data.password, env.bcrypt.rounds);

    const user = await UsuarioRepository.create({
      id_rol: rol.id_rol,
      nombre: data.nombre,
      email: data.email,
      documento: data.documento,
      password_hash,
      estado: 'Activo'
    });

    await bitacoraService.log({
      userId: user.id_usuario, action: 'REGISTRO_USUARIO', entity: 'Usuario',
      entityId: user.id_usuario, ip: context.ip, userAgent: context.userAgent
    });

    return {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      email: user.email
    };
  }
}

module.exports = new AuthService();
