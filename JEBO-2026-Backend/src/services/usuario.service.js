const bcrypt = require('bcrypt');
const { UsuarioRepository, RolRepository } = require('../repositories');
const { NotFoundError, BusinessError, ValidationError } = require('../utils/errors');
const { normalizarEmail } = require('../utils/validators');
const env = require('../config/env');
const bitacoraService = require('./bitacora.service');
const { ESTADOS_USUARIO } = require('../constants');

const sinHash = (row) => {
  if (!row || typeof row !== 'object') return row;
  const { password_hash, ...resto } = row;
  return resto;
};

class UsuarioService {

  async findAll(filters = {}, { alcance, solicitanteId } = {}) {
    return UsuarioRepository.findAll({ ...filters, alcance, solicitanteId });
  }

  async findOpciones({ rol } = {}) {
    return UsuarioRepository.findOpciones({ rol });
  }

  async findById(id, { alcance, solicitanteId } = {}) {
    const user = await UsuarioRepository.findById(id, { alcance, solicitanteId });
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  async findByIdCompleto(id) {
    const user = await UsuarioRepository.findById(id, {
      alcance: { global: true },
      solicitanteId: id
    });
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  async create(data, context = {}) {

    if (data.email) data.email = normalizarEmail(data.email);

    const existingEmail = await UsuarioRepository.findByEmail(data.email);
    if (existingEmail) throw new BusinessError('El email ya existe');

    const existingDoc = await UsuarioRepository.findByDocumento(data.documento);
    if (existingDoc) throw new BusinessError('El documento ya está registrado');

    const rol = await RolRepository.findByDescripcion(data.rol || 'Profesor');
    const password_hash = await bcrypt.hash(data.password, env.bcrypt.rounds);

    const result = await UsuarioRepository.create({
      id_rol: rol.id_rol,
      nombre: data.nombre,
      email: data.email,
      documento: data.documento,
      password_hash
    });

    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_USUARIO', entity: 'Usuario',
      entityId: result.id_usuario, ip: context.ip, userAgent: context.userAgent
    });

    return sinHash(result);
  }

  async update(id, data, context = {}) {

    const revocarSesion = { pedido: false, motivo: [] };

    const actual = await this.findByIdCompleto(id);

    if (data.email) {

      data.email = normalizarEmail(data.email);
      const existing = await UsuarioRepository.findByEmail(data.email);
      if (existing && String(existing.id_usuario) !== String(id)) {
        throw new BusinessError('El email ya existe');
      }
    }

    if (data.documento) {
      const existing = await UsuarioRepository.findByDocumento(data.documento);
      if (existing && String(existing.id_usuario) !== String(id)) {
        throw new BusinessError('El documento ya está registrado');
      }
    }

    if (data.rol) {
      const nombrePedido = data.rol;
      const rol = await RolRepository.findByDescripcion(nombrePedido);
      data.id_rol = rol.id_rol;
      delete data.rol;

      if (actual.rol_descripcion !== nombrePedido) {
        revocarSesion.pedido = true;
        revocarSesion.motivo.push('rol');
      }
    }

    if (data.estado !== undefined) {

      if (!Object.values(ESTADOS_USUARIO).includes(data.estado)) {
        throw new ValidationError(
          `Estado inválido: se espera ${Object.values(ESTADOS_USUARIO).join(' o ')}`
        );
      }

      if (data.estado === ESTADOS_USUARIO.INACTIVO && String(context.userId) === String(id)) {
        throw new BusinessError(
          'No podés desactivar tu propia cuenta: quedaría sin forma de volver a entrar. Pedile a otro administrador que lo haga.'
        );
      }

      if (actual.estado !== data.estado) {
        revocarSesion.pedido = true;
        revocarSesion.motivo.push('estado');
      }
    }

    if (data.password) {
      data.password_hash = await bcrypt.hash(data.password, env.bcrypt.rounds);
      delete data.password;
      revocarSesion.pedido = true;
      revocarSesion.motivo.push('password');
    } else {
      delete data.password;
    }

    const result = await UsuarioRepository.actualizarSeguridad(id, data, {
      revocarSesion: revocarSesion.pedido
    });

    const ACCIONES = {
      password: 'CAMBIAR_PASSWORD_USUARIO',
      estado: 'CAMBIAR_ESTADO_USUARIO',
      rol: 'CAMBIAR_ROL_USUARIO'
    };

    const accion =
      ACCIONES[['password', 'estado', 'rol'].find((c) => revocarSesion.motivo.includes(c))]
      || 'ACTUALIZAR_USUARIO';

    const detalle = {
      ...(revocarSesion.pedido ? { sesion_cortada: true } : {}),
      ...(revocarSesion.motivo.length ? { cambios: revocarSesion.motivo } : {})
    };

    await bitacoraService.log({
      userId: context.userId, action: accion,
      entity: 'Usuario', entityId: id, ip: context.ip, userAgent: context.userAgent,

      detail: Object.keys(detalle).length ? detalle : null
    });

    return sinHash(result);
  }

  async delete(id, context = {}) {
    await this.findByIdCompleto(id);
    const result = await UsuarioRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_USUARIO', entity: 'Usuario',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new UsuarioService();
