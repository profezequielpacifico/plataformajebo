const knex = require('../config/knex');
const { PartidoRepository, EventoRepository, RelojRepository, StaffPartidoRepository } = require('../repositories');
const { NotFoundError, BusinessError, ForbiddenError, ValidationError } = require('../utils/errors');
const { ESTADOS_PARTIDO, ESTADOS_RELOJ, ESTADOS_EVENTO, TIPOS_EVENTO, ROLES } = require('../constants');
const bitacoraService = require('./bitacora.service');

async function assertArbitroAsignado(idPartido, userId, rol) {
  if (rol === ROLES.ADMIN || rol === ROLES.SUPERADMIN) return null;
  if (rol !== ROLES.ARBITRO) {
    throw new ForbiddenError('Rol insuficiente para esta operación');
  }
  const staff = await StaffPartidoRepository.findByPartido(idPartido);
  if (!staff.some((s) => String(s.id_usuario) === String(userId))) {
    throw new ForbiddenError('No estás asignado a este partido como árbitro');
  }
  return Number(userId);
}

class EventoService {
  _assertEquipoEnPartido(partido, idEquipo) {
    const id = parseInt(idEquipo, 10);
    if (Number.isNaN(id)) throw new ValidationError('Equipo inválido');
    const local = parseInt(partido.id_equipo_local, 10);
    const visitante = parseInt(partido.id_equipo_visitante, 10);
    if (id !== local && id !== visitante) {
      throw new BusinessError('El equipo indicado no participa de este partido');
    }
    return id;
  }

  _assertArbitroAsignado(idPartido, userId, rol) {
    return assertArbitroAsignado(idPartido, userId, rol);
  }

  _assertPartidoEnJuego(partido) {
    if (partido.estado !== ESTADOS_PARTIDO.EN_JUEGO) {
      throw new BusinessError(
        `Solo se pueden registrar eventos con el partido "${ESTADOS_PARTIDO.EN_JUEGO}". ` +
        `Este partido está "${partido.estado}".`
      );
    }
  }

  async registrar(idPartido, data, context = {}) {
    const partido = await PartidoRepository.findById(idPartido, { alcance: context.alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');

    const idArbitro = await this._assertArbitroAsignado(idPartido, context.userId, context.rol);
    this._assertPartidoEnJuego(partido);
    const idEquipo = this._assertEquipoEnPartido(partido, data.id_equipo);

    if (data.idempotency_key) {
      const previo = await EventoRepository.findByIdempotencyKey(idPartido, data.idempotency_key);
      if (previo) return previo;
    }

    const evento = await knex.transaction(async (trx) => {
      await trx.raw('SELECT pg_advisory_xact_lock(?)', [Number(idPartido)]);
      return EventoRepository.registrar(trx, {
        id_partido: partido.id_partido,
        id_equipo: idEquipo,

        id_usuario_arbitro: idArbitro,
        registrado_por: context.userId,
        idempotency_key: data.idempotency_key
      });
    });

    await bitacoraService.log({
      userId: context.userId,
      action: 'REGISTRAR_EVENTO_PARTIDO',
      entity: 'EventoPartido',
      entityId: evento.id_evento,
      detail: {
        id_partido: partido.id_partido,
        numero_evento: evento.numero_evento,
        id_equipo: idEquipo,
        segundos_partido: evento.segundos_partido,
        tipo_evento: evento.tipo_evento
      },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return EventoRepository.findById(evento.id_evento);
  }

  async findByPartido(idPartido, params, context = {}) {
    const partido = await PartidoRepository.findById(idPartido, { alcance: context.alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');
    return EventoRepository.findByPartido({ id_partido: idPartido, ...params });
  }

  async anular(idPartido, idEvento, data, context = {}) {
    const partido = await PartidoRepository.findById(idPartido, { alcance: context.alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');

    const evento = await EventoRepository.findById(idEvento);
    if (!evento) throw new NotFoundError('Evento no encontrado');
    if (Number(evento.id_partido) !== Number(idPartido)) {
      throw new NotFoundError('Evento no encontrado');
    }
    if (evento.estado === ESTADOS_EVENTO.ANULADO) {
      throw new BusinessError('El evento ya está anulado');
    }

    await this._assertArbitroAsignado(idPartido, context.userId, context.rol);

    const motivo = typeof data.motivo_anulacion === 'string' ? data.motivo_anulacion.trim() : '';
    if (!motivo) throw new ValidationError('El motivo de anulación es obligatorio');

    const actualizado = await EventoRepository.anular(idEvento, {
      anulado_por: context.userId,
      motivo_anulacion: motivo
    });

    await bitacoraService.log({
      userId: context.userId,
      action: 'ANULAR_EVENTO_PARTIDO',
      entity: 'EventoPartido',
      entityId: idEvento,
      detail: {
        id_partido: partido.id_partido,
        numero_evento: actualizado.numero_evento,
        motivo_anulacion: motivo
      },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return EventoRepository.findById(idEvento);
  }
}

class RelojService {
  async _getPartido(idPartido, context) {
    const partido = await PartidoRepository.findById(idPartido, { alcance: context.alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');
    return partido;
  }

  async accion(idPartido, accion, context = {}) {
    const partido = await this._getPartido(idPartido, context);
    const id = partido.id_partido;

    await assertArbitroAsignado(id, context.userId, context.rol);

    if (partido.estado === ESTADOS_PARTIDO.FINALIZADO) {
      throw new BusinessError('No se puede operar el reloj de un partido finalizado');
    }
    if (partido.estado === ESTADOS_PARTIDO.CANCELADO) {
      throw new BusinessError('No se puede operar el reloj de un partido cancelado');
    }

    let resultado = null;

    if (accion === 'INICIAR') {
      if (partido.estado !== ESTADOS_PARTIDO.EN_JUEGO) {
        throw new BusinessError('El partido debe estar "En Juego" para iniciar el reloj');
      }
      resultado = await RelojRepository.iniciar(id);
      if (!resultado) {
        throw new BusinessError('El reloj ya fue iniciado');
      }
    } else if (accion === 'PAUSAR') {
      if (partido.reloj_estado !== ESTADOS_RELOJ.EN_CURSO) {
        throw new BusinessError('El reloj no está en curso');
      }
      resultado = await RelojRepository.pausar(id);
    } else if (accion === 'REANUDAR') {
      if (partido.reloj_estado !== ESTADOS_RELOJ.PAUSADO) {
        throw new BusinessError('El reloj no está pausado');
      }
      resultado = await RelojRepository.reanudar(id);
    } else {
      throw new ValidationError(`Acción de reloj inválida: ${accion}`);
    }

    await bitacoraService.log({
      userId: context.userId,
      action: `RELOJ_${accion}`,
      entity: 'Partido',
      entityId: id,
      detail: { accion, reloj_estado: resultado.reloj_estado },
      ip: context.ip,
      userAgent: context.userAgent
    });

    return this.estado(id, context);
  }

  async estado(idPartido, context = {}) {
    const partido = await this._getPartido(idPartido, context);
    const reloj = await RelojRepository.segundosActuales(partido.id_partido);
    return {
      estado: reloj.reloj_estado,
      iniciado_en: reloj.reloj_iniciado_en,
      acumulado_seg: reloj.reloj_acumulado_seg,
      segundos: Number(reloj.segundos_actuales) || 0
    };
  }
}

module.exports = {
  eventoService: new EventoService(),
  relojService: new RelojService()
};
