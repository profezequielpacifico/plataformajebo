const {
  PresentacionRepository,
  PresentacionParticipanteRepository,
  EvaluacionRepository,
  StaffPresentacionRepository,
  ConfiguracionPuntajeRepository,
  EquipoIntegranteRepository,
  PartidoRepository
} = require('../repositories');
const { BusinessError, NotFoundError } = require('../utils/errors');
const { ESTADOS_PRESENTACION, ROLES } = require('../constants');
const bitacoraService = require('./bitacora.service');
const autorizacionService = require('./autorizacion.service');
const logger = require('../config/logger');

/**
 * Un encuentro es de un solo trío.
 *
 * Gimnasia Artística no juega por equipos enfrentados: cada trío sale solo, se
 * lo evalúa y termina. La presentación se venía usando como una ronda que
 * juntaba varios tríos en la misma grilla de evaluación, y ahí no había a qué
 * comparar. El trigger `presentacion_un_solo_trio` cierra el mismo hueco del
 * lado de la base; este es el mensaje que el usuario lee.
 */
function assertUnSoloTrio(participantes) {
  if (!Array.isArray(participantes)) return;
  if (participantes.length > 1) {
    throw new BusinessError(
      `Una presentación es de un solo trío y se cargaron ${participantes.length}. `
      + 'Cargá un encuentro por trío: cada uno con su orden de salida.'
    );
  }
}

class PresentacionService {
  /**
   * Listado de encuentros.
   *
   * El admin ve la jornada completa. Un juez ve SOLO los encuentros donde figura en
   * el jurado: es lo que le permite llegar a su hoja sin que el listado sea el de
   * todos los encuentros de todos los torneos.
   *
   * Antes esta regla no existia y el filtro por `id_usuario` se escribia pero el
   * repositorio no lo usaba, o sea que el listado era el mismo para los dos roles.
   * Se dejo de escribir el parametro muerto en vez de dejarlo, porque el proximo
   * que lo lea creera que filtra.
   */
  async findAll(params, context = {}) {
    const criteria = { ...params };
    if (context.rol === ROLES.JUEZ) {
      criteria.id_jurado = context.userId;
    }
    return PresentacionRepository.findAll(criteria);
  }

  async findById(id, context = {}) {
    const presentacion = await PresentacionRepository.findById(id);
    if (!presentacion) throw new NotFoundError('Presentación no encontrada');
    return presentacion;
  }

  async create(data, context = {}) {
    const { id_torneo, id_disciplina, participantes, staff, ...resto } = data;

    // Antes de tocar la base. El trigger lo vuelve a comprobar, pero con un

    assertUnSoloTrio(participantes);

    // Validar que la disciplina sea EVALUACION
    const disciplina = await require('../repositories').DisciplinaRepository.findById(id_disciplina);
    if (!disciplina || disciplina.tipo_competencia !== 'EVALUACION') {
      throw new BusinessError('La disciplina debe ser de tipo EVALUACION');
    }

    if (resto.orden) {
      const existe = await PresentacionRepository.findAll({ id_torneo, orden: resto.orden });
      if (existe.length > 0) throw new BusinessError('Ya existe una presentación con ese orden en el torneo');
    }

    // Todo el alta va en una transacción. Antes cada paso por separado: si fallaba
    // el segundo trío (por ejemplo, la validación de composición), la
    // presentación ya estaba insertada y quedaba en el listado con un solo
    // participante y sin jurado, sin que el admin pudiera saber que estaba rota.
    const knex = require('../config/knex');
    const presentacion = await knex.transaction(async (trx) => {
      const creada = await PresentacionRepository.create({
        id_torneo,
        id_disciplina,
        ...resto,
        estado: 'PROGRAMADA'
      }, trx);

      // Crear participantes
      if (participantes && participantes.length > 0) {
        for (const p of participantes) {
          await PresentacionParticipanteRepository.create({
            id_presentacion: creada.id_presentacion,
            id_equipo: p.id_equipo,
            rol: p.rol || 'GRUPO',
            orden_salida: p.orden_salida
          }, trx);
        }
      }

      // Crear staff (jueces)
      if (staff && staff.length > 0) {
        await StaffPresentacionRepository.bulkCreate(
          staff.map(s => ({
            id_presentacion: creada.id_presentacion,
            id_usuario: s.id_usuario,
            rol: s.rol
          })),
          trx
        );
      }

      // Crear configuración de puntaje por defecto
      await ConfiguracionPuntajeRepository.upsert({
        id_torneo,
        id_disciplina,
        ...ConfiguracionPuntajeRepository.defaultGimnasia()
      }, trx);

      return creada;
    });

    // La composición del trío se avisa, no se bloquea: el reglamento la fiscaliza
    // como observación del jurado y frenar el alta obligaría al admin a corregir
    // datos de conformación de los gimnastas para poder programming un torneo.
    // Va fuera de la transacción porque es solo lectura y no debe abortar nada.
    if (participantes && participantes.length > 0) {
      for (const p of participantes) {
        if (p.rol !== 'GRUPO') continue;
        const validacion = await EquipoIntegranteRepository.validarTrio(p.id_equipo);
        if (!validacion.valido) {
          logger.warn(`Equipo ${p.id_equipo} no cumple regla de trío: ${validacion.motivo}`);
        }
      }
    }

    await bitacoraService.log({
      userId: context.userId,
      action: 'CREAR_PRESENTACION',
      entity: 'Presentacion',
      entityId: presentacion.id_presentacion,
      detail: { id_torneo, id_disciplina, participantes: participantes?.length || 0 },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return presentacion;
  }

  async update(id, data, context = {}) {
    const presentacion = await this.findById(id, context);

    if (presentacion.estado === ESTADOS_PRESENTACION.FINALIZADA) {
      throw new BusinessError('No se puede modificar una presentación finalizada');
    }

    const { id_torneo, id_disciplina, participantes, staff, ...resto } = data;

    // `update` borra los participantes y los vuelve a escribir, así que por acá

    assertUnSoloTrio(participantes);

    const actualizada = await PresentacionRepository.update(id, resto);

    // Actualizar participantes si se envían
    if (participantes) {
      await PresentacionParticipanteRepository.deleteByPresentacion(id);
      for (const p of participantes) {
        await PresentacionParticipanteRepository.create({
          id_presentacion: id,
          id_equipo: p.id_equipo,
          rol: p.rol || 'GRUPO',
          orden_salida: p.orden_salida
        });
      }
    }

    if (staff) {
      await StaffPresentacionRepository.deleteByPresentacion(id);
      await StaffPresentacionRepository.bulkCreate(
        staff.map(s => ({
          id_presentacion: id,
          id_usuario: s.id_usuario,
          rol: s.rol
        }))
      );
    }

    await bitacoraService.log({
      userId: context.userId,
      action: 'ACTUALIZAR_PRESENTACION',
      entity: 'Presentacion',
      entityId: id,
      detail: data,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return actualizada;
  }

  async updateEstado(id, estado, context = {}) {
    const presentacion = await this.findById(id, context);

    if (presentacion.estado === ESTADOS_PRESENTACION.FINALIZADA) {
      throw new BusinessError('No se puede modificar una presentación finalizada');
    }

    const validTransitions = {
      PROGRAMADA: ['EN_CURSO', 'CANCELADA'],
      EN_CURSO: ['FINALIZADA', 'CANCELADA'],
      FINALIZADA: [],
      CANCELADA: ['PROGRAMADA']
    };

    if (!validTransitions[presentacion.estado]?.includes(estado)) {
      throw new BusinessError(`Transición inválida: ${presentacion.estado} → ${estado}`);
    }

    if (estado === 'EN_CURSO') {
      const participantes = await PresentacionParticipanteRepository.findByPresentacion(id);
      if (participantes.length === 0) throw new BusinessError('No hay participantes para iniciar');

      const staff = await StaffPresentacionRepository.findJueces(id);
      if (staff.length !== 3) throw new BusinessError('Se requieren exactamente 3 jueces para iniciar');
    }

    if (estado === 'FINALIZADA') {
      // Verificar que todos los participantes tengan evaluaciones de los 3 jueces
      const evaluaciones = await EvaluacionRepository.findByPresentacion(id);
      const participantes = await PresentacionParticipanteRepository.findByPresentacion(id);
      const jueces = await StaffPresentacionRepository.findJueces(id);

      for (const p of participantes) {
        const evalsP = evaluaciones.filter(e => e.id_equipo === p.id_equipo);
        if (evalsP.length !== jueces.length) {
          throw new BusinessError(`Participante ${p.equipo_nombre} no tiene evaluaciones de todos los jueces`);
        }
      }
    }

    const result = await PresentacionRepository.updateEstado(id, estado);

    await bitacoraService.log({
      userId: context.userId,
      action: `CAMBIO_ESTADO_PRESENTACION_${estado}`,
      entity: 'Presentacion',
      entityId: id,
      detail: { estado_anterior: presentacion.estado, estado_nuevo: estado },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return result;
  }

  async delete(id, context = {}) {
    const presentacion = await this.findById(id, context);

    if (presentacion.estado !== 'PROGRAMADA' && presentacion.estado !== 'CANCELADA') {
      throw new BusinessError('Solo se pueden eliminar presentaciones programadas o canceladas');
    }

    await PresentacionRepository.delete(id);

    await bitacoraService.log({
      userId: context.userId,
      action: 'ELIMINAR_PRESENTACION',
      entity: 'Presentacion',
      entityId: id,
      ip: context.ip,
      userAgent: context.userAgent
    });

    return { id, deleted: true };
  }

  async getResultado(id, context = {}) {
    const presentacion = await this.findById(id, context);
    const resultado = await EvaluacionRepository.resultadoFinal(id);
    return {
      presentacion,
      resultado
    };
  }

  async getDetalleEvaluacion(id, context = {}) {
    const presentacion = await this.findById(id, context);

    // Misma regla que el listado y que `guardarHoja`: un juez entra a la hoja de

    if (context.rol === ROLES.JUEZ) {
      await autorizacionService.assertEvaluarPresentacion(
        { id: context.userId, rol: context.rol },
        id
      );
    }

    const participantes = await PresentacionParticipanteRepository.findByPresentacion(id);
    const staff = await StaffPresentacionRepository.findByPresentacion(id);
    const jueces = await StaffPresentacionRepository.findJueces(id);
    const evaluaciones = await EvaluacionRepository.findByPresentacion(id);
    const config = await ConfiguracionPuntajeRepository.findByTorneoDisciplina(
      presentacion.id_torneo,
      presentacion.id_disciplina
    );

    // Organizar evaluaciones por participante y juez
    const evaluacionesMap = {};
    for (const e of evaluaciones) {
      const key = `${e.id_equipo}_${e.id_juez}`;
      evaluacionesMap[key] = e;
    }

    return {
      presentacion,
      participantes,
      staff,
      jueces,
      evaluaciones: evaluacionesMap,
      config,
      // El id del usuario que esta pidiendo. La pantalla de puntuacion lo
      // necesita para dos cosas: decidir si habilita la escritura (solo el juez
      // asignado a esta presentacion, o un admin, guarda la hoja) y saber que
      // fila de `evaluaciones` es la suya. Sin esto el boton de guardar queda
      // deshabilitado para siempre, porque `esJuez` se derivaba de un
      // `currentUserId` que nadie mandaba.
      currentUserId: context.userId || null
    };
  }
}

module.exports = new PresentacionService();