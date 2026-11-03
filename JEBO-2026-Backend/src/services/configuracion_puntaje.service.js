const { ConfiguracionPuntajeRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class ConfiguracionPuntajeService {
  async findAll() {
    return ConfiguracionPuntajeRepository.findAll();
  }

  async findById(id) {
    const c = await ConfiguracionPuntajeRepository.findById(id);
    if (!c) throw new NotFoundError('Configuración no encontrada');
    return c;
  }

  async create(data, context = {}) {
    const result = await ConfiguracionPuntajeRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_CONFIGURACION_PUNTAJE', entity: 'ConfiguracionPuntaje',
      entityId: result.id_configuracion, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await ConfiguracionPuntajeRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_CONFIGURACION_PUNTAJE', entity: 'ConfiguracionPuntaje',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await ConfiguracionPuntajeRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_CONFIGURACION_PUNTAJE', entity: 'ConfiguracionPuntaje',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new ConfiguracionPuntajeService();
