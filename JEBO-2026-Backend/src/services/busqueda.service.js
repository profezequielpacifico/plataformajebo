const { BusquedaRepository } = require('../repositories');

class BusquedaService {
  /**
   * `alcance` es obligatorio y no tiene valor por defecto: omitir el segundo
   * argumento tiene que ser un error, no una búsqueda sin filtro. Es el mismo
   * criterio que `filtrarPorInstitucion`.
   */
  async global(q, alcance) {
    return BusquedaRepository.global(q, alcance);
  }
}

module.exports = new BusquedaService();
