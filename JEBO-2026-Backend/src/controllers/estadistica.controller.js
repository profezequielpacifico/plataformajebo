const { HTTP_STATUS } = require('../constants');
const estadisticaService = require('../services/estadistica.service');
const { formatResponse } = require('../utils');

class EstadisticaController {
  async dashboard(req, res, next) {
    try {
      const data = await estadisticaService.dashboard(req.alcance);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async torneoStats(req, res, next) {
    try {
      const data = await estadisticaService.torneoStats(req.params.id, req.alcance);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EstadisticaController();
