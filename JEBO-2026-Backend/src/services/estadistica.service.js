const { EstadisticaRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');

class EstadisticaService {
  async dashboard(alcance) {
    return EstadisticaRepository.dashboard(alcance);
  }

  async torneoStats(id, alcance) {
    const row = await EstadisticaRepository.torneoStats(id, alcance);

    if (!row) throw new NotFoundError('Estadísticas no encontradas para el torneo');
    return row;
  }
}

module.exports = new EstadisticaService();
