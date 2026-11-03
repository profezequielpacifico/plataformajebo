const { HTTP_STATUS } = require('../constants');
const posicionService = require('../services/posicion.service');
const { formatResponse } = require('../utils');

class PosicionController {
  async findByTorneo(req, res, next) {
    try {
      const data = await posicionService.findByTorneo(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PosicionController();
