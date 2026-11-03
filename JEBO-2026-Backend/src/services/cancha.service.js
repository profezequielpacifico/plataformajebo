const { CanchaRepository, CanchaHorarioRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');
const bitacoraService = require('./bitacora.service');

class CanchaService {
  async findAll() {
    return CanchaRepository.findAll();
  }

  async findById(id) {
    const c = await CanchaRepository.findById(id);
    if (!c) throw new NotFoundError('Cancha no encontrada');
    return c;
  }

  async create(data, context = {}) {
    const result = await CanchaRepository.create(data);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_CANCHA', entity: 'Cancha',
      entityId: result.id_cancha, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async update(id, data, context = {}) {
    await this.findById(id);
    const result = await CanchaRepository.update(id, data);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_CANCHA', entity: 'Cancha',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async delete(id, context = {}) {
    await this.findById(id);
    const result = await CanchaRepository.delete(id);
    await bitacoraService.log({
      userId: context.userId, action: 'ELIMINAR_CANCHA', entity: 'Cancha',
      entityId: id, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }

  async getHorarios() {
    return CanchaHorarioRepository.findAllHorarios();
  }

  async getSchedule(canchaId) {
    await this.findById(canchaId);
    return CanchaHorarioRepository.findSchedule(canchaId);
  }

  async updateSchedule(canchaId, items, context = {}) {
    await this.findById(canchaId);
    const result = await CanchaHorarioRepository.replaceSchedule(canchaId, items || []);
    await bitacoraService.log({
      userId: context.userId, action: 'ACTUALIZAR_HORARIOS_CANCHA', entity: 'Cancha',
      entityId: canchaId, ip: context.ip, userAgent: context.userAgent
    });
    return result;
  }
}

module.exports = new CanchaService();
