const { LocalidadRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class LocalidadService {
  async findAll(id_distrito) {
    return LocalidadRepository.findAll(id_distrito);
  }

  async findById(id) {
    const l = await LocalidadRepository.findById(id);
    if (!l) throw new NotFoundError('Localidad no encontrada');
    return l;
  }

  async create(data, context = {}) {
    const result = await LocalidadRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_LOCALIDAD', entity: 'Localidad',
      entityId: result.id_localidad, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await LocalidadRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_LOCALIDAD', entity: 'Localidad',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await LocalidadRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_LOCALIDAD', entity: 'Localidad',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new LocalidadService();
