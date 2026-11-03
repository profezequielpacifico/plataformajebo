const { DisciplinaRepository } = require('../repositories');
const { NotFoundError, BusinessError } = require('../utils/errors');

class DisciplinaService {
  async findAll() {
    return DisciplinaRepository.findAll();
  }

  async findById(id) {
    const d = await DisciplinaRepository.findById(id);
    if (!d) throw new NotFoundError('Disciplina no encontrada');
    return d;
  }

  async create(data) {
    const existing = await DisciplinaRepository.findByName(data.nombre);
    if (existing) throw new BusinessError('La disciplina ya existe');
    return DisciplinaRepository.create(data);
  }

  async update(id, data) {
    await this.findById(id);
    if (data.nombre) {
      const existing = await DisciplinaRepository.findByName(data.nombre);
      // Por `String`: `id` viene de `req.params` y el id del driver es entero,
      // asi que `13 !== '13'` daba "la disciplina ya existe" contra la misma

      if (existing && String(existing.id_disciplina) !== String(id)) {
        throw new BusinessError('La disciplina ya existe');
      }
    }
    return DisciplinaRepository.update(id, data);
  }

  async delete(id) {
    await this.findById(id);
    return DisciplinaRepository.delete(id);
  }
}

module.exports = new DisciplinaService();
