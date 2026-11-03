const { EstadisticaRepository } = require('../repositories');
const { NotFoundError } = require('../utils/errors');

class EstadisticaService {
  async dashboard(alcance) {
    return EstadisticaRepository.dashboard(alcance);
  }

  /**
   * `alcance` es obligatorio y no tiene valor por defecto: omitirlo tiene que
   * ser un error, no unas estadísticas sin filtro (X-05).
   */
  async torneoStats(id, alcance) {
    const row = await EstadisticaRepository.torneoStats(id, alcance);
    // El repositorio devuelve `null` tanto si el torneo no existe como si

    if (!row) throw new NotFoundError('Estadísticas no encontradas para el torneo');
    return row;
  }
}

module.exports = new EstadisticaService();
