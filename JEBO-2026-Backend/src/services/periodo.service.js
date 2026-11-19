const knex = require('../config/knex');
const { PartidoRepository, PeriodoRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const { ESTADOS_PARTIDO } = require('../constants');
const bitacoraService = require('./bitacora.service');

const SETS_PARA_GANAR = 2;
const EN_JUEGO = 'EN_JUEGO';
const CERRADO = 'CERRADO';

const resumenSets = (lista, idLocal, idVisitante) => {
  const cerrados = lista.filter((p) => p.estado === CERRADO);
  const enJuego = lista.find((p) => p.estado === EN_JUEGO);
  const local = cerrados.filter((p) => Number(p.id_equipo_ganador) === Number(idLocal)).length;
  const visitante = cerrados.filter((p) => Number(p.id_equipo_ganador) === Number(idVisitante)).length;
  let ganador = null;
  if (local >= SETS_PARA_GANAR) ganador = Number(idLocal);
  else if (visitante >= SETS_PARA_GANAR) ganador = Number(idVisitante);
  return {
    local,
    visitante,
    jugados: cerrados.length,
    enJuego: enJuego ? Number(enJuego.numero) : null,
    ganador,
    puedeAbrirTercero: !enJuego && cerrados.length === SETS_PARA_GANAR && ganador !== null,
    definido: ganador !== null && !enJuego
  };
};

const nombreDe = (partido) => (partido.nombre_periodo || 'Set').toLowerCase();

class PeriodoService {
  async _partidoOperable(idPartido, context, trx) {
    await trx.raw('SELECT pg_advisory_xact_lock(?)', [Number(idPartido)]);
    const partido = await PartidoRepository.findById(idPartido, { alcance: context.alcance });
    if (!partido) throw new NotFoundError('Partido no encontrado');
    if (partido.estado !== ESTADOS_PARTIDO.EN_JUEGO) {
      throw new BusinessError(`El partido tiene que estar "${ESTADOS_PARTIDO.EN_JUEGO}"`);
    }
    if (partido.resultado_cargado) {
      throw new BusinessError('El resultado del partido ya está cerrado');
    }
    const { assertArbitroAsignado } = require('./evento.service');
    await assertArbitroAsignado(idPartido, context.userId, context.rol);
    return partido;
  }

  async cerrar(idPartido, numero, context = {}) {
    const resultado = await knex.transaction(async (trx) => {
      const partido = await this._partidoOperable(idPartido, context, trx);
      const nombre = nombreDe(partido);
      const actual = await PeriodoRepository.enJuego(idPartido, trx);
      if (!actual || Number(actual.numero) !== Number(numero)) {
        throw new BusinessError(`El ${nombre} ${numero} no está en juego`);
      }
      const puntosLocal = Number(actual.puntos_local) || 0;
      const puntosVisitante = Number(actual.puntos_visitante) || 0;
      if (puntosLocal === puntosVisitante) {
        throw new BusinessError(`No se puede terminar un ${nombre} empatado`);
      }

      const periodo = await PeriodoRepository.cerrar(actual.id_partido_periodo, {
        puntos_local: puntosLocal,
        puntos_visitante: puntosVisitante,
        id_equipo_ganador: puntosLocal > puntosVisitante
          ? Number(partido.id_equipo_local)
          : Number(partido.id_equipo_visitante),
        cerrado_por: context.userId
      }, trx);

      const lista = await PeriodoRepository.listar(idPartido, trx);
      const resumen = resumenSets(lista, partido.id_equipo_local, partido.id_equipo_visitante);
      const maximo = Number(partido.max_periodos) || 3;
      if (resumen.ganador === null && resumen.enJuego === null && resumen.jugados < maximo) {
        lista.push(await PeriodoRepository.abrir(idPartido, resumen.jugados + 1, trx));
      }
      return { periodo, resumen: resumenSets(lista, partido.id_equipo_local, partido.id_equipo_visitante) };
    });

    await bitacoraService.log({
      userId: context.userId, action: 'CERRAR_PERIODO_PARTIDO', entity: 'Partido', entityId: idPartido,
      detail: {
        numero: Number(numero),
        puntos_local: resultado.periodo.puntos_local,
        puntos_visitante: resultado.periodo.puntos_visitante
      },
      ip: context.ip, userAgent: context.userAgent
    });
    return resultado;
  }

  async abrirTercero(idPartido, context = {}) {
    const resultado = await knex.transaction(async (trx) => {
      const partido = await this._partidoOperable(idPartido, context, trx);
      const previa = resumenSets(
        await PeriodoRepository.listar(idPartido, trx), partido.id_equipo_local, partido.id_equipo_visitante
      );
      if (!previa.puedeAbrirTercero) {
        throw new BusinessError(`Solo se puede jugar el ${nombreDe(partido)} 3 cuando un equipo ganó los dos primeros`);
      }
      const periodo = await PeriodoRepository.abrir(idPartido, 3, trx);
      const lista = await PeriodoRepository.listar(idPartido, trx);
      return { periodo, resumen: resumenSets(lista, partido.id_equipo_local, partido.id_equipo_visitante) };
    });

    await bitacoraService.log({
      userId: context.userId, action: 'ABRIR_PERIODO_PARTIDO', entity: 'Partido', entityId: idPartido,
      detail: { numero: 3 }, ip: context.ip, userAgent: context.userAgent
    });
    return resultado;
  }

  async abrirPrimeroSiCorresponde(partido, trx = knex) {
    if (!partido.marcador_por_periodos) return null;
    if (await PeriodoRepository.tieneSets(partido.id_partido, trx)) return null;
    if (await PeriodoRepository.contarEventos(partido.id_partido, trx) > 0) return null;
    return PeriodoRepository.abrir(partido.id_partido, 1, trx);
  }

  async estado(partido) {
    const lista = await PeriodoRepository.listar(partido.id_partido);
    if (lista.length === 0) return null;
    return {
      nombre: partido.nombre_periodo || 'Set',
      max: Number(partido.max_periodos) || 3,
      lista,
      resumen: resumenSets(lista, partido.id_equipo_local, partido.id_equipo_visitante)
    };
  }
}

module.exports = { periodoService: new PeriodoService(), resumenSets };
