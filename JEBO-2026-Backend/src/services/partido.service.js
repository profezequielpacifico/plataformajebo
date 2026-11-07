const knex = require('../config/knex');
const { PartidoRepository, StaffPartidoRepository, PosicionRepository, RelojRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const { ESTADOS_PARTIDO, ESTADOS_RELOJ, ROLES_ARBITRO } = require('../constants');
const bitacoraService = require('./bitacora.service');
const disponibilidadService = require('./disponibilidad.service');
const autorizacionService = require('./autorizacion.service');
const { assertTorneoAceptaPartidos } = require('./tipoCompetencia.service');
const logger = require('../config/logger');

class PartidoService {
  async findAll(params) {
    return PartidoRepository.findAll(params);
  }

  async findMios(params, context = {}) {
    const repoParams = { ...params };

    if (!autorizacionService.esAdministrador(context.rol)) {
      repoParams.id_usuario_arbitro = context.userId;
    }
    return PartidoRepository.findAll(repoParams);
  }

  async _assertArbitroAsignado(idPartido, userId, rol) {
    await autorizacionService.assertOperarPartido({ id: userId, rol }, idPartido);
  }

  async findById(id, { alcance } = {}) {
    const partido = await PartidoRepository.findById(id, { alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');
    return partido;
  }

  async findLive(id, context = {}) {
    const partido = await this.findById(id, context);
    const reloj = await RelojRepository.segundosActuales(partido.id_partido);
    const { rows } = await knex.raw('SELECT now() as server_time');

    return {
      partido: {
        id_partido: partido.id_partido,
        estado: partido.estado,
        id_torneo: partido.id_torneo,
        torneo: partido.torneo,
        id_disciplina: partido.id_disciplina,
        disciplina_nombre: partido.disciplina_nombre,
        fecha: partido.fecha,
        hora: partido.hora,
        cancha_nombre: partido.cancha_nombre,
        cancha_ubicacion: partido.cancha_ubicacion
      },
      equipos: {
        local: {
          id: partido.id_equipo_local,
          nombre: partido.equipo_local_nombre,
          profesor: partido.equipo_local_coach
        },
        visitante: {
          id: partido.id_equipo_visitante,
          nombre: partido.equipo_visitante_nombre,
          profesor: partido.equipo_visitante_coach
        }
      },
      arbitros: partido.arbitros || [],
      marcador: {

        local: Number(partido.puntos_local) || 0,
        visitante: Number(partido.puntos_visitante) || 0
      },
      reloj: {
        estado: reloj.reloj_estado,
        iniciado_en: reloj.reloj_iniciado_en,
        acumulado_seg: reloj.reloj_acumulado_seg,
        segundos: Number(reloj.segundos_actuales) || 0
      },
      server_time: rows[0].server_time
    };
  }

  async _recalcularPosiciones(idTorneo) {
    if (!idTorneo) return;
    try {
      await PosicionRepository.recalcular(idTorneo, null);
    } catch (err) {
      logger.error('Fallo al recalcular las posiciones del torneo ' + idTorneo, err);
    }
  }

  async _assertEquiposInscriptos(idTorneo, idEquipoLocal, idEquipoVisitante) {
    const ids = Array.from(new Set([parseInt(idEquipoLocal, 10), parseInt(idEquipoVisitante, 10)]));
    if (ids.some((id) => Number.isNaN(id))) return;

    const inscriptos = await knex('posicion')
      .where('id_torneo', idTorneo)
      .whereIn('id_equipo', ids)
      .pluck('id_equipo');

    for (const id of ids) {
      if (!inscriptos.includes(id)) {
        const equipo = await knex('equipo').where('id_equipo', id).first();
        throw new BusinessError(
          `El equipo "${equipo ? equipo.nombre : id}" no está inscripto en el torneo seleccionado`
        );
      }
    }
  }

  async _resolveDisponibilidad(data, esNuevo = false) {
    if (data.id_disponibilidad) return null;
    if (data.fecha && data.hora && data.id_cancha) {
      const disp = await disponibilidadService.createDisponibilidad(data.id_cancha, data.fecha, data.hora);
      return disp.id_disponibilidad;
    }
    if (data.fecha && esNuevo) {
      let fc = await knex('fecha_cancha').where('fecha', data.fecha).first();
      if (!fc) [fc] = await knex('fecha_cancha').insert({ fecha: data.fecha }).returning('*');
      const horarioId = 1;
      const dateTime = `${data.fecha} 09:00:00`;
      let fh = await knex('fecha_horario').where('fecha_horario', dateTime).first();
      if (!fh) await knex('fecha_horario').insert({ fecha_horario: dateTime, id_fecha_cancha: fc.id_fecha_cancha, id_horario_cancha: horarioId });
      const canchaIds = await knex('cancha').select('id_cancha').limit(1);
      if (canchaIds.length > 0) {
        let disp = await knex('disponibilidad_cancha').where('fecha_horario', dateTime).where('id_cancha', canchaIds[0].id_cancha).first();
        if (!disp) [disp] = await knex('disponibilidad_cancha').insert({ fecha_horario: dateTime, id_cancha: canchaIds[0].id_cancha }).returning('*');
        return disp.id_disponibilidad;
      }
    }
    return null;
  }

  async create(data, context = {}) {
    const insertData = { ...data };
    delete insertData.fecha;
    delete insertData.hora;
    delete insertData.id_cancha;
    delete insertData.arbitros;

    await assertTorneoAceptaPartidos(insertData.id_torneo);

    const idDisponibilidad = await this._resolveDisponibilidad(data, true);
    if (idDisponibilidad) insertData.id_disponibilidad = idDisponibilidad;

    await this._assertEquiposInscriptos(
      insertData.id_torneo,
      insertData.id_equipo_local,
      insertData.id_equipo_visitante
    );

    const result = await PartidoRepository.create(insertData);

    if (data.arbitros && Array.isArray(data.arbitros)) {

      for (const [i, usuarioId] of data.arbitros.entries()) {
        await StaffPartidoRepository.create(
          result.id_partido,
          usuarioId,
          i === 0 ? ROLES_ARBITRO.PRINCIPAL : ROLES_ARBITRO.ASISTENTE
        );
      }
    }
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_PARTIDO', entity: 'Partido',
      entityId: result.id_partido, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    const partido = await this.findById(id, context);
    if (partido.estado === ESTADOS_PARTIDO.FINALIZADO) {
      throw new BusinessError('No se puede modificar un partido finalizado');
    }

    await assertTorneoAceptaPartidos(data.id_torneo || partido.id_torneo);

    if (data.id_equipo_local || data.id_equipo_visitante) {
      await this._assertEquiposInscriptos(
        data.id_torneo || partido.id_torneo,
        data.id_equipo_local || partido.id_equipo_local,
        data.id_equipo_visitante || partido.id_equipo_visitante
      );
    }

    const updateData = { ...data };
    delete updateData.arbitros;
    delete updateData.fecha;
    delete updateData.hora;
    delete updateData.id_cancha;

    const idDisponibilidad = await this._resolveDisponibilidad(data);
    if (idDisponibilidad) updateData.id_disponibilidad = idDisponibilidad;

    let result = null;
    if (Object.keys(updateData).length > 0) {
      result = await PartidoRepository.update(id, updateData);
    }

    if (data.arbitros && Array.isArray(data.arbitros)) {
      await StaffPartidoRepository.deleteByPartido(id);
      for (const [i, usuarioId] of data.arbitros.entries()) {
        await StaffPartidoRepository.create(
          id,
          usuarioId,
          i === 0 ? ROLES_ARBITRO.PRINCIPAL : ROLES_ARBITRO.ASISTENTE
        );
      }
    }

    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_PARTIDO', entity: 'Partido',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async updateResult(id, context = {}) {
    const partido = await this.findById(id, context);
    await this._assertArbitroAsignado(id, context.userId, context.rol);
    if (partido.estado === ESTADOS_PARTIDO.FINALIZADO) {
      throw new BusinessError('No se puede modificar un partido finalizado');
    }
    if (partido.reloj_estado === ESTADOS_RELOJ.PENDIENTE) {
      throw new BusinessError('Debe iniciar el reloj del partido antes de cerrar el resultado');
    }

    const sellado = await PartidoRepository.cerrarResultado(id);

    await bitacoraService.log({
      userId: context.userId, action: 'SELLAR_RESULTADO_PARTIDO', entity: 'Partido',
      entityId: id,
      detail: { goles_local: sellado.goles_local, goles_visitante: sellado.goles_visitante },
      ip: context.ip, userAgent: context.userAgent
    });
    return sellado;
  }

  async _assertSePuedeComenzar(partido, estado, context = {}) {
    const esComienzo = estado === ESTADOS_PARTIDO.EN_JUEGO
      && partido.estado !== ESTADOS_PARTIDO.EN_JUEGO
      && partido.estado !== ESTADOS_PARTIDO.SUSPENDIDO;
    if (!esComienzo) return false;

    const fechaProgramada = partido.fecha;
    if (!fechaProgramada) {
      await bitacoraService.log({
        userId: context.userId, action: 'INICIAR_PARTIDO_SIN_FECHA', entity: 'Partido',
        entityId: partido.id_partido,
        detail: { estado_anterior: partido.estado, observacion: 'sin fecha de disponibilidad; se permite el inicio' },
        ip: context.ip, userAgent: context.userAgent
      });
      return true;
    }

    const hoy = await PartidoRepository.fechaDeHoy();
    if (fechaProgramada === hoy) return true;

    const etapa = fechaProgramada < hoy ? 'La fecha del partido ya pasó' : 'Todavía no llega la fecha del partido';
    throw new BusinessError(
      `${etapa}. Está programado para el ${fechaProgramada} y hoy es ${hoy}.`
    );
  }

  async updateStatus(id, estado, context = {}) {
    const partido = await this.findById(id, context);
    if (partido.estado === ESTADOS_PARTIDO.FINALIZADO) {
      throw new BusinessError('No se puede modificar un partido finalizado');
    }
    await this._assertArbitroAsignado(id, context.userId, context.rol);
    if (estado === ESTADOS_PARTIDO.FINALIZADO
      && !partido.resultado_cargado) {
      throw new BusinessError('Debe cargar el resultado antes de finalizar el partido');
    }

    const arrancando = await this._assertSePuedeComenzar(partido, estado, context);

    if (estado === ESTADOS_PARTIDO.SUSPENDIDO
      && partido.reloj_estado === ESTADOS_RELOJ.EN_CURSO) {
      await RelojRepository.pausar(id);
    } else if (partido.estado === ESTADOS_PARTIDO.SUSPENDIDO
      && estado === ESTADOS_PARTIDO.EN_JUEGO
      && partido.reloj_estado === ESTADOS_RELOJ.PAUSADO) {
      await RelojRepository.reanudar(id);
    }

    const result = await PartidoRepository.updateStatus(id, estado);
    if (result.estado === ESTADOS_PARTIDO.FINALIZADO) {
      await RelojRepository.finalizar(id);
      await this._recalcularPosiciones(result.id_torneo);
    }
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_ESTADO_PARTIDO', entity: 'Partido',
      entityId: id,

      detail: { estado, ...(arrancando ? { inicio_verificado: true } : {}) },
      ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    const partido = await this.findById(id, context);
    const result = await PartidoRepository.delete(id);
    await this._recalcularPosiciones(partido.id_torneo);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_PARTIDO', entity: 'Partido',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new PartidoService();
