const bcrypt = require('bcryptjs');
const { UsuarioRepository, RolRepository } = require('../repositories');
const { NotFoundError, BusinessError, ValidationError } = require('../utils/errors');
const { normalizarEmail } = require('../utils/validators');
const env = require('../config/env');
const bitacoraService = require('./bitacora.service');
const { ESTADOS_USUARIO } = require('../constants');

/**
 * Lo que se devuelve al cliente cuando se crea o actualiza un usuario.
 *
 * El problema: `crud.create` / `crud.update` terminan en `.returning('*')`, así
 * que la fila completa —con `password_hash` adentro—viaja en el body de
 * `POST /users` y `PUT /users/:id`. Las lecturas ya usaban la proyección de
 * `COLUMNAS_PUBLICAS`; las escrituras no, y esa asimetría es exactamente lo que
 * dejó el hash viajando.
 *
 * No alcanza con borrar la clave del objeto: se filtra por construcción, así
 * que se relee la fila con la proyección pública. El doble acceso es barato
 * (una lectura por escritura de usuario) y evita que el hash vuelva a colarse si
 * mañana alguien agrega una columna sensible.
 */
const sinHash = (row) => {
  if (!row || typeof row !== 'object') return row;
  const { password_hash, ...resto } = row;
  return resto;
};

class UsuarioService {
  // `findAll` y `findById` reciben el alcance y el id del solicitante: son los

  async findAll(filters = {}, { alcance, solicitanteId } = {}) {
    return UsuarioRepository.findAll({ ...filters, alcance, solicitanteId });
  }

  /**
   * Nombres para los selectores de personal (F1.6).
   *
   * No recibe `alcance` ni `solicitanteId` a proposito, y esa es la diferencia
   * con `findAll`: lo que devuelve son tres campos que no son datos personales,
   * y a quien se lo pido ya lo filtro el guard de la ruta. Meterle alcance
   * obligaria a decidir que proyeccion corresponde a cada rol para terminar
   * ser Projectando_ la misma en todos los casos.
   */
  async findOpciones({ rol } = {}) {
    return UsuarioRepository.findOpciones({ rol });
  }

  async findById(id, { alcance, solicitanteId } = {}) {
    const user = await UsuarioRepository.findById(id, { alcance, solicitanteId });
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  /**
   * Lectura completa, sin proyección.
   *
   * Para uso INTERNO únicamente: `update` y `delete` necesitan la fila entera
   * para validar duplicados de email y documento, y el servicio de auth
   * necesita `token_version`. No la	use un controlador para responder a un
   * cliente: esa es la vía por la que X-16 estaba abierto.
   */
  async findByIdCompleto(id) {
    const user = await UsuarioRepository.findById(id, {
      alcance: { global: true },
      solicitanteId: id
    });
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }

  async create(data, context = {}) {
    // La ruta ya normaliza, pero el servicio es la puerta real: lo que entra acá

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
    // Qué cambios cortan las sesiones abiertas del usuario afectado, y por qué:
    //

    const revocarSesion = { pedido: false, motivo: [] };
    // Lectura completa: acá la fila se usa para validar duplicados, comparar el

    const actual = await this.findByIdCompleto(id);

    // Las dos validaciones de duplicado comparan por `String`: `id` viene de

    if (data.email) {
      // Mismo motivo que en `create`: el chequeo de duplicado y lo que se

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
      // Se compara por NOMBRE contra la fila actual y no contra `id_rol`: la

      if (actual.rol_descripcion !== nombrePedido) {
        revocarSesion.pedido = true;
        revocarSesion.motivo.push('rol');
      }
    }

    if (data.estado !== undefined) {
      // La ruta ya valida el enum y devuelve 400. Acá se repite porque el servicio

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

    // Entrada propia en la bitácora para lo que no es un `ACTUALIZAR_USUARIO` de

    const ACCIONES = {
      password: 'CAMBIAR_PASSWORD_USUARIO',
      estado: 'CAMBIAR_ESTADO_USUARIO',
      rol: 'CAMBIAR_ROL_USUARIO'
    };
    // La precedencia es fija y en el orden de sensibilidad: si un mismo `PUT`

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
      // `null` y no `{}` para una edicion de perfil: una fila con `detalle` vacío

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
