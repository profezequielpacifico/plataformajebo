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

  async createHorarios(horarios, context = {}) {
    const aHHMM = (hora) => String(hora).trim().slice(0, 5);
    const pedidos = horarios.map((h) => ({ hora_inicio: aHHMM(h.hora_inicio), hora_fin: aHHMM(h.hora_fin) }));
    for (const h of pedidos) {
      if (h.hora_fin <= h.hora_inicio) {
        throw new BusinessError(`El horario ${h.hora_inicio} debe terminar después de empezar`);
      }
    }
    const repetido = pedidos.find((h, i) => pedidos.findIndex((x) => x.hora_inicio === h.hora_inicio) !== i);
    if (repetido) {
      throw new BusinessError(`El horario ${repetido.hora_inicio} aparece más de una vez en la lista`);
    }
    const resultado = await CanchaHorarioRepository.createHorarios(pedidos);
    await bitacoraService.log({
      userId: context.userId, action: 'CREAR_HORARIOS_CANCHA', entity: 'HorarioCancha',
      ip: context.ip, userAgent: context.userAgent,
      detail: { creados: resultado.creados.map((h) => aHHMM(h.hora_inicio)), existentes: resultado.existentes }
    });
    return resultado;
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
