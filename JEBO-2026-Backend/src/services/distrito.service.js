const { DistritoRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class DistritoService {
  async findAll() {
    return DistritoRepository.findAll();
  }

  async findById(id) {
    const d = await DistritoRepository.findById(id);
    if (!d) throw new NotFoundError('Distrito no encontrado');
    return d;
  }

  async create(data, context = {}) {
    const result = await DistritoRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_DISTRITO', entity: 'Distrito',
      entityId: result.id_distrito, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await DistritoRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_DISTRITO', entity: 'Distrito',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await DistritoRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_DISTRITO', entity: 'Distrito',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new DistritoService();
