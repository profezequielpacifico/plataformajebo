const { EquipoRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');
const institucionUsuarioService = require('./institucion-usuario.service');
const knex = require('../config/knex');
const { ROLES } = require('../constants');

// Regla de negocio del alta propia de un Profesor: un profesor no pasa de 3
// equipos. Vive en el servicio, no en una constraint de la base, porque solo
// aplica al duenio con rol Profesor y una UNIQUE/CHECK de `equipo` no distingue
// roles.
const MAX_EQUIPOS_PROFESOR = 3;

class EquipoService {
  async findAll(params) {
    return EquipoRepository.findAll(params);
  }

  async findById(id, { alcance } = {}) {
    const equipo = await EquipoRepository.findById(id, { alcance });
    if (!equipo) throw new NotFoundError('Equipo no encontrado');
    return equipo;
  }

  async create(data, context = {}) {
    const esProfesor = context.rol === ROLES.PROFESOR;

    // Alta propia: el equipo queda a nombre de quien lo crea. Sin este forzado,
    // `id_usuario` viene en el body y el Profesor podria darselo a nombre de
    // otro, saltandose tanto las reglas de abajo como el alcance por
    // institucion (X-05).
    if (esProfesor) {
      data.id_usuario = context.userId;
      await this._assertInstitucionPropia(context.userId, data.id_institucion);
    }

    // Las reglas son del duenio, no del que teclea: si un Administrador da de
    // alta un equipo a nombre de un Profesor, el limite de 3 y el nombre unico
    // entre sus equipos aplican igual.
    if (data.id_usuario) {
      const rolDuenio = await this._rolDe(data.id_usuario);
      if (rolDuenio === ROLES.PROFESOR) {
        await this._assertReglasDeProfesor(data.id_usuario, data.nombre, context.userId === data.id_usuario);
      }
    }

    const result = await EquipoRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_EQUIPO', entity: 'Equipo',
      entityId: result.id_equipo, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  /**
   * El tenant de un equipo no puede elegirlo un Profesor "de la nada": su
   * institucion es la que ya tiene asignada en `usuario_institucion`. El
   * formulario ya llega recortado por alcance (el dropdown solo muestra las
   * suyas), pero el backend no se apoya en eso: es el mismo contrato que
   * `alcance.service` exige para las lecturas, aca aplicado a la escritura.
   * Sin pertenencia no hay alta — el desbloqueo es la asignacion explicita del
   * Administrador, no un dropdown mas amplio.
   */
  async _assertInstitucionPropia(idUsuario, idInstitucion) {
    const propias = await institucionUsuarioService.listarDe(idUsuario);
    if (!propias.length) {
      throw new BusinessError('No tenés una institución asignada: que un administrador te asigne una institución antes de crear el equipo');
    }
    const esSuya = propias.some((i) => String(i.id_institucion) === String(idInstitucion));
    if (!esSuya) {
      const nombres = propias.map((i) => i.nombre).join(', ');
      throw new BusinessError(`Solo podés crear equipos en tu institución (${nombres})`);
    }
  }

  async _rolDe(idUsuario) {
    const fila = await knex('usuario as u')
      .leftJoin('rol as r', 'r.id_rol', 'u.id_rol')
      .where('u.id_usuario', idUsuario)
      .select('r.descripcion as rol')
      .first();
    return fila ? fila.rol : null;
  }

  /** Maximo 3 equipos y nombre unico entre los equipos del propio Profesor. */
  async _assertReglasDeProfesor(idUsuario, nombre, esDuenio) {
    const { total } = await EquipoRepository.countDelDuenio(idUsuario);
    if (Number(total) >= MAX_EQUIPOS_PROFESOR) {
      throw new BusinessError(esDuenio
        ? `No podés tener más de ${MAX_EQUIPOS_PROFESOR} equipos: ya tenés ${MAX_EQUIPOS_PROFESOR}`
        : `Un profesor no puede tener más de ${MAX_EQUIPOS_PROFESOR} equipos`);
    }

    const repetido = await EquipoRepository.findByDuenioYNombre(idUsuario, nombre);
    if (repetido) {
      throw new BusinessError(esDuenio
        ? `Ya tenés un equipo con el nombre "${nombre}": entre tus equipos los nombres no pueden repetirse`
        : `Ese profesor ya tiene un equipo con el nombre "${nombre}": entre sus equipos los nombres no pueden repetirse`);
    }
  }

  async update(id, data, context = {}) {
    await this.findById(id, context);
    const result = await EquipoRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_EQUIPO', entity: 'Equipo',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id, context);
    const result = await EquipoRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_EQUIPO', entity: 'Equipo',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new EquipoService();
