/**
 * CompetitionOrchestrator - Coordina StageEngine con persistencia.
 * 
 * Responsabilidades:
 * - Leer datos de DB y construir StageContext
 * - Ejecutar StageEngine con el contexto
 * - Validar resultado
 * - Persistir en transacción (todo o nada)
 * 
 * NO decide NI implementa reglas de negocio. Eso es trabajo de StageEngine.
 */

const knex = require('../config/knex');
const StageEngine = require('./stage-engine');
const bitacoraService = require('./bitacora.service');
const {
  CompetenciaRepository,
  CompetenciaEtapaRepository,
  EtapaParticipanteRepository
} = require('../repositories');
const { BusinessError } = require('../utils/errors');

class CompetitionOrchestrator {
  /**
   * Genera participantes para la siguiente etapa de forma idempotente.
   * @param {number} id_competencia_etapa - ID de la etapa destino
   * @param {Array} participantes - Participantes origen (desde StageEngine)
   * @param {Object} context - Contexto con userId, ip, userAgent
   * @returns {Array} Participantes creados
   */
  async generarParticipantesSiguienteEtapa(id_competencia_etapa, participantes, context = {}) {
    if (!Array.isArray(participantes) || participantes.length === 0) {
      throw new Error('Se requiere al menos un participante');
    }

    return await knex.transaction(async (trx) => {
      // Verificar que la etapa destino existe
      const etapaDestino = await CompetenciaEtapaRepository.findByIdConTrx(id_competencia_etapa, trx);
      if (!etapaDestino) {
        throw new Error(`Etapa destino no encontrada: ${id_competencia_etapa}`);
      }

      // Verificar idempotencia: no duplicar participantes
      const existentes = await EtapaParticipanteRepository.findByEtapaConTrx(id_competencia_etapa, trx);
      const idsExistentes = new Set(existentes.map(p => p.equipo_id));

      const nuevos = participantes.filter(p => !idsExistentes.has(p.equipo_id || p.id));

      if (nuevos.length === 0) {
        return []; // Idempotente: ya existen
      }

      // Insertar nuevos participantes
      const items = nuevos.map((p, idx) => ({
        id_competencia_etapa,
        equipo_id: p.equipo_id || p.id,
        id_etapa_origen: p.id_etapa_origen || null,
        origen_tipo: p.origen_tipo || null,
        origen_clave: p.origen_clave || null,
        id_encuentro_origen: p.id_encuentro_origen || null,
        posicion_origen: p.posicion_origen || p.orden_clasificacion || null,
        motivo: p.motivo || 'CLASIFICADO_POR_POSICION',
        orden_llave: p.orden_llave || null,
        orden_insercion: existentes.length + idx + 1
      }));

      const creados = await trx('etapa_participante').insert(items).returning('*');

      await bitacoraService.logConTrx(trx, {
        userId: context.userId,
        action: 'GENERAR_PARTICIPANTES',
        entity: 'CompetenciaEtapa',
        entityId: id_competencia_etapa,
        ip: context.ip,
        userAgent: context.userAgent,
        detalle: JSON.stringify({ creados: creados.length, preexistentes: idsExistentes.size })
      });

      return creados;
    });
  }

  /**
   * Evalúa una etapa con StageEngine y devuelve el resultado.
   * NO persiste. Solo evalúa.
   * @param {number} id_competencia_etapa
   * @returns {Object} Resultado del StageEngine
   */
  async evaluarEtapa(id_competencia_etapa) {
    const etapa = await CompetenciaEtapaRepository.findById(id_competencia_etapa);
    if (!etapa) {
      throw new Error(`Etapa no encontrada: ${id_competencia_etapa}`);
    }

    // Obtener reglas activas
    const reglas = await require('../repositories').EtapaReglaRepository.findActivasByEtapa(id_competencia_etapa);

    // Obtener participantes actuales
    const participantes = await EtapaParticipanteRepository.findByEtapa(id_competencia_etapa);

    // Construir contexto para StageEngine
    const context = {
      participants: participantes.map(p => ({
        id: p.equipo_id,
        equipo_id: p.equipo_id,
        posicion: p.posicion_origen,
        id_etapa_origen: p.id_etapa_origen,
        origen_tipo: p.origen_tipo,
        origen_clave: p.origen_clave,
        motivo: p.motivo
      })),
      rules: reglas.map(r => ({
        tipo: r.tipo,
        configuracion: typeof r.configuracion === 'string' ? JSON.parse(r.configuracion) : r.configuracion
      })),
      config: typeof etapa.configuracion === 'string' ? JSON.parse(etapa.configuracion) : etapa.configuracion
    };

    return StageEngine.evaluate(context);
  }

  /**
   * Crea una competencia con sus etapas y reglas en una transacción.
   * @param {Object} data - { nombre, descripcion, estado, etapas: [{ nombre, orden, tipo, es_final, reglas: [{ tipo, configuracion }] }] }
   * @param {Object} context
   * @returns {Object} Competencia creada
   */
  async crearCompetencia(data, context = {}) {
    const { nombre, descripcion, estado, etapas = [] } = data;

    if (!nombre) throw new Error('Nombre es requerido');

    return await knex.transaction(async (trx) => {
      // Crear competencia
      const [competencia] = await CompetenciaRepository.createConTrx({
        nombre,
        descripcion,
        estado: estado || 'BORRADOR'
      }, trx);

      // Crear etapas y reglas
      for (let idx = 0; idx < etapas.length; idx++) {
        const e = etapas[idx];
        const [etapaCreada] = await CompetenciaEtapaRepository.createConTrx({
          id_competencia: competencia.id_competencia,
          nombre: e.nombre,
          orden: e.orden || idx + 1,
          tipo: e.tipo || null,
          es_final: e.es_final || false,
          estado: e.estado || 'BORRADOR',
          configuracion: JSON.stringify(e.configuracion || {})
        }, trx);

        // Crear reglas de la etapa
        if (Array.isArray(e.reglas)) {
          for (const r of e.reglas) {
            await require('../repositories').EtapaReglaRepository.createConTrx({
              id_competencia_etapa: etapaCreada.id_competencia_etapa,
              tipo: r.tipo,
              configuracion: JSON.stringify(r.configuracion || {}),
              orden: r.orden || 1,
              activa: true
            }, trx);
          }
        }
      }

      // La auditoría se hace dentro de la transacción para garantizar atomicidad
      await bitacoraService.logConTrx(trx, {
        userId: context.userId,
        action: 'CREAR_COMPETENCIA',
        entity: 'Competencia',
        entityId: competencia.id_competencia,
        ip: context.ip,
        userAgent: context.userAgent,
        detalle: JSON.stringify({ nombre, etapas: etapas.length })
      });

      return competencia;
    });
  }
}

const orchestrator = new CompetitionOrchestrator();

module.exports = {
  generarParticipantesSiguienteEtapa: (...args) => orchestrator.generarParticipantesSiguienteEtapa(...args),
  evaluarEtapa: (...args) => orchestrator.evaluarEtapa(...args),
  crearCompetencia: (...args) => orchestrator.crearCompetencia(...args),
};
