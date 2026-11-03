const { TorneoRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');
const etapaService = require('./etapa.service');
const knex = require('../config/knex');

class TorneoService {
  async findAll(params) {
    return TorneoRepository.findAll(params);
  }

  async findById(id, { alcance } = {}) {
    const torneo = await TorneoRepository.findById(id, { alcance });
    if (!torneo) throw new NotFoundError('Torneo no encontrado');
    return torneo;
  }

  async create(data, context = {}) {
    const { etapas, ...torneoData } = data;
    const result = await knex.transaction(async (trx) => {
      const torneo = await TorneoRepository.create(torneoData);
      if (Array.isArray(etapas) && etapas.length > 0) {
        const torneoFechas = { fecha_inicio: torneo.fecha_inicio, fecha_fin: torneo.fecha_fin };
        await etapaService.createForTorneo(torneo.id_torneo, etapas, torneoFechas, context);
      }
      return torneo;
    });
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_TORNEO', entity: 'Torneo',
      entityId: result.id_torneo, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id, context);
    const { etapas, ...torneoData } = data;
    const result = await knex.transaction(async (trx) => {
      const torneo = await TorneoRepository.update(id, torneoData);
      if (Array.isArray(etapas)) {
        const torneoFechas = { fecha_inicio: torneo.fecha_inicio, fecha_fin: torneo.fecha_fin };
        await etapaService.syncForTorneo(id, etapas, torneoFechas, context);
      }
      return torneo;
    });
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_TORNEO', entity: 'Torneo',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id, context);
    const result = await knex.transaction(async (trx) => {
      await trx('staff_partido')
        .whereIn('id_partido', trx('partido').select('id_partido').where('id_torneo', id))
        .del();
      await trx('partido').where('id_torneo', id).del();
      await trx('posicion').where('id_torneo', id).del();
      await trx('etapa').where('id_torneo', id).del();
      const deleted = await trx('torneo')
        .where('id_torneo', id)
        .del()
        .returning('id_torneo');
      return deleted[0];
    });
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_TORNEO', entity: 'Torneo',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async findQualified(id, limit = 4, { alcance } = {}) {
    return TorneoRepository.findQualified(id, limit, { alcance });
  }

  async findFinal(id, { alcance } = {}) {
    return TorneoRepository.findFinal(id, { alcance });
  }

  async uploadReglamento(id, reglamentoUrl, context = {}) {
    const result = await TorneoRepository.update(id, { reglamento: reglamentoUrl });
    await bitacoraService.log({
      userId: context.userId, action: 'SUBIR_REGLAMENTO', entity: 'Torneo',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new TorneoService();
