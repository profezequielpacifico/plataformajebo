const { PosicionRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');

class PosicionService {
  // El alcance filtra por institución dentro de la tabla de posiciones (X-05).

  async findByTorneo(id, { alcance } = {}) {
    const data = await PosicionRepository.findByTorneo(id, { alcance });
    if (!data || data.length === 0) throw new NotFoundError('No hay posiciones para este torneo');
    return data;
  }
}

module.exports = new PosicionService();
