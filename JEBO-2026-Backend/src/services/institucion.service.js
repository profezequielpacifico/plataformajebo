const { InstitucionRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class InstitucionService {
  async findAll(alcance) {
    return InstitucionRepository.findAll({ alcance });
  }

  async findById(id, { alcance } = {}) {
    const i = await InstitucionRepository.findById(id, { alcance });
    if (!i) throw new NotFoundError('Institución no encontrada');
    return i;
  }

  async create(data, context = {}) {
    const existing = await InstitucionRepository.findByName(data.nombre, data.id_distrito);
    if (existing) throw new BusinessError('La institución ya existe en ese distrito');
    const result = await InstitucionRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_INSTITUCION', entity: 'Institucion',
      entityId: result.id_institucion, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    const actual = await this.findById(id, context);
    if (data.nombre || data.id_distrito) {
      const existing = await InstitucionRepository.findByName(
        data.nombre || actual.nombre,
        data.id_distrito || actual.id_distrito
      );
      if (existing && String(existing.id_institucion) !== String(id)) {
        throw new BusinessError('La institución ya existe en ese distrito');
      }
    }
    const result = await InstitucionRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_INSTITUCION', entity: 'Institucion',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id, context);
    const result = await InstitucionRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_INSTITUCION', entity: 'Institucion',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new InstitucionService();
