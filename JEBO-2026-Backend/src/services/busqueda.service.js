const { BusquedaRepository } = require('../repositories');

class BusquedaService {
  async global(q, alcance) {
    return BusquedaRepository.global(q, alcance);
  }
}

module.exports = new BusquedaService();
