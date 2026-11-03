const { BitacoraRepository } = require('../repositories');

class BitacoraService {
  async findAll({ page, limit } = {}) {
    return BitacoraRepository.findAll({ page, limit });
  }

  async log({ userId = null, action, entity = null, entityId = null, detail = null, ip = null, userAgent = null, result = 'exitoso' }) {
    // `entity` y `entityId` se descartaban cuando la llamada no pasaba `detail`,
    // dejando la mayoria de las acciones de la bitacora sin detalle alguno.
    const contexto = {};
    if (entity) contexto.entity = entity;
    if (entityId !== null && entityId !== undefined) contexto.entityId = entityId;
    if (detail) Object.assign(contexto, detail);

    return BitacoraRepository.create({
      id_usuario: userId,
      tipo_accion: action,
      ip_address: ip,
      user_agent: userAgent,
      resultado: result,
      detalle: Object.keys(contexto).length ? JSON.stringify(contexto) : null
    });
  }

  async logConTrx(trx, { userId = null, action, entity = null, entityId = null, detail = null, ip = null, userAgent = null, result = 'exitoso' }) {
    // Versión transaccional de `log`. Usada por el CompetitionOrchestrator para
    // garantizar que la auditoría se confirme solo si la operación se confirma.
    const contexto = {};
    if (entity) contexto.entity = entity;
    if (entityId !== null && entityId !== undefined) contexto.entityId = entityId;
    if (detail) Object.assign(contexto, detail);

    return trx('bitacora').insert({
      id_usuario: userId,
      tipo_accion: action,
      ip_address: ip,
      user_agent: userAgent,
      resultado: result,
      detalle: Object.keys(contexto).length ? JSON.stringify(contexto) : null
    }).returning('*');
  }
}

module.exports = new BitacoraService();
