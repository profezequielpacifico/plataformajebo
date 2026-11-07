const { PosicionRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');

class PosicionService {

  async findByTorneo(id, { alcance } = {}) {
    const data = await PosicionRepository.findByTorneo(id, { alcance });
    if (!data || data.length === 0) throw new NotFoundError('No hay posiciones para este torneo');
    return data;
  }
}

module.exports = new PosicionService();
