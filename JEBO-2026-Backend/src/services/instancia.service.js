const { InstanciaRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class InstanciaService {
  async findAll(params = {}) {
    const limit = params.limit ? parseInt(params.limit, 10) : undefined;
    const offset = params.offset ? parseInt(params.offset, 10) : undefined;
    const search = params.search || undefined;

    const [data, total] = await Promise.all([
      InstanciaRepository.findAll({ limit, offset, search }),
      InstanciaRepository.count({ search })
    ]);

    if (limit) {
      return { data, total, page: Math.floor((offset || 0) / limit) + 1, limit };
    }

    return { data, total };
  }

  async findById(id) {
    const item = await InstanciaRepository.findById(id);
    if (!item) throw new NotFoundError('Instancia no encontrada');
    return item;
  }

  async create(data, context = {}) {
    const result = await InstanciaRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_INSTANCIA', entity: 'Instancia',
      entityId: result.id_instancia, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await InstanciaRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_INSTANCIA', entity: 'Instancia',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await InstanciaRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_INSTANCIA', entity: 'Instancia',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new InstanciaService();
