const { HTTP_STATUS } = require('../constants');
const busquedaService = require('../services/busqueda.service');
const { formatResponse } = require('../utils');

class BusquedaController {
  async global(req, res, next) {
    try {
      const { q } = req.query;
      const data = await busquedaService.global(q, req.alcance);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BusquedaController();
