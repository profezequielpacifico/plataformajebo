const { RegionRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class RegionService {
  async findAll() {
    return RegionRepository.findAll();
  }

  async findById(id) {
    const r = await RegionRepository.findById(id);
    if (!r) throw new NotFoundError('Región no encontrada');
    return r;
  }

  async create(data, context = {}) {
    const result = await RegionRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_REGION', entity: 'Region',
      entityId: result.id_region, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await RegionRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_REGION', entity: 'Region',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await RegionRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_REGION', entity: 'Region',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new RegionService();
