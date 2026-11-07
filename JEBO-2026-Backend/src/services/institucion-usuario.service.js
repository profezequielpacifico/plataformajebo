const knex = require('../config/knex');
const alcanceService = require('./alcance.service');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class InstitucionUsuarioService {
  async listarDe(idUsuario) {
    const existe = await knex('usuario').where('id_usuario', idUsuario).first();
    if (!existe) throw new NotFoundError('Usuario no encontrado');

    return knex('usuario_institucion as ui')
      .join('institucion as i', 'ui.id_institucion', 'i.id_institucion')
      .where('ui.id_usuario', idUsuario)
      .select('i.id_institucion', 'i.nombre')
      .orderBy('i.nombre');
  }

  async asignar(idUsuario, idInstitucion, context = {}) {
    const usuario = await knex('usuario')
      .leftJoin('rol as r', 'r.id_rol', 'usuario.id_rol')
      .where('usuario.id_usuario', idUsuario)
      .select('usuario.id_usuario', 'r.descripcion as rol')
      .first();
    if (!usuario) throw new NotFoundError('Usuario no encontrado');

    const institucion = await knex('institucion').where('id_institucion', idInstitucion).first();
    if (!institucion) throw new NotFoundError('Institución no encontrada');

    if (alcanceService.esGlobal({ rol: usuario.rol })) {
      throw new BusinessError(
        `Un ${usuario.rol} tiene alcance global: no necesita asignación de institución. ` +
        'Asignarle una produciría una fila que no cambia lo que ve.'
      );
    }

    const [insertada] = await knex('usuario_institucion')
      .insert({ id_usuario: idUsuario, id_institucion: idInstitucion })
      .onConflict(['id_usuario', 'id_institucion'])
      .ignore()
      .returning('id_usuario');

    if (!insertada) {

      return { asignada: false, usuario: idUsuario, institucion: institucion.nombre };
    }

    await bitacoraService.log({
      userId: context.userId,
      action: 'ASIGNAR_INSTITUCION_USUARIO',
      entity: 'Usuario',
      entityId: idUsuario,
      detail: { institucion: institucion.nombre, id_institucion: idInstitucion },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { asignada: true, usuario: idUsuario, institucion: institucion.nombre };
  }

  async quitar(idUsuario, idInstitucion, context = {}) {
    const usuario = await knex('usuario').where('id_usuario', idUsuario).first();
    if (!usuario) throw new NotFoundError('Usuario no encontrado');

    const borrados = await knex('usuario_institucion')
      .where({ id_usuario: idUsuario, id_institucion: idInstitucion })
      .del();

    if (!borrados) {
      throw new NotFoundError('El usuario no está asignado a esa institución');
    }

    await bitacoraService.log({
      userId: context.userId,
      action: 'QUITAR_INSTITUCION_USUARIO',
      entity: 'Usuario',
      entityId: idUsuario,
      detail: { id_institucion: idInstitucion },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { quitada: true, usuario: idUsuario, institucion: idInstitucion };
  }

  async reemplazar(idUsuario, idsInstitucion, context = {}) {
    const usuario = await knex('usuario')
      .leftJoin('rol as r', 'r.id_rol', 'usuario.id_rol')
      .where('usuario.id_usuario', idUsuario)
      .select('usuario.id_usuario', 'r.descripcion as rol')
      .first();
    if (!usuario) throw new NotFoundError('Usuario no encontrado');

    if (alcanceService.esGlobal({ rol: usuario.rol })) {
      throw new BusinessError(
        `Un ${usuario.rol} tiene alcance global: su lista de instituciones siempre está vacía.`
      );
    }

    const unicos = [...new Set((idsInstitucion || []).map((i) => parseInt(i, 10)))].filter(
      (i) => Number.isInteger(i)
    );
    if (unicos.length !== (idsInstitucion || []).length) {
      throw new BusinessError('La lista de instituciones tiene ids inválidos o repetidos');
    }

    const existentes = unicos.length
      ? await knex('institucion').whereIn('id_institucion', unicos).pluck('id_institucion')
      : [];
    if (existentes.length !== unicos.length) {
      const faltan = unicos.filter((i) => !existentes.includes(i));
      throw new NotFoundError(`Institución no encontrada: ${faltan.join(', ')}`);
    }

    const antes = await this.listarDe(idUsuario);
    const antesIds = antes.map((i) => i.id_institucion).sort((a, b) => a - b);
    const despuesIds = [...unicos].sort((a, b) => a - b);
    if (JSON.stringify(antesIds) === JSON.stringify(despuesIds)) {
      return { usuario: idUsuario, instituciones: antes, cambiado: false };
    }

    await knex.transaction(async (trx) => {
      await trx('usuario_institucion').where('id_usuario', idUsuario).del();
      if (unicos.length) {
        await trx('usuario_institucion').insert(
          unicos.map((id_institucion) => ({ id_usuario: idUsuario, id_institucion }))
        );
      }
    });

    await bitacoraService.log({
      userId: context.userId,
      action: 'CAMBIAR_INSTITUCIONES_USUARIO',
      entity: 'Usuario',
      entityId: idUsuario,
      detail: { antes: antesIds, despues: despuesIds },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { usuario: idUsuario, instituciones: await this.listarDe(idUsuario), cambiado: true };
  }
}

module.exports = new InstitucionUsuarioService();
