const { HTTP_STATUS } = require('../constants');
const disponibilidadService = require('../services/disponibilidad.service');
const { formatResponse } = require('../utils');

class DisponibilidadController {
  async getAvailableSlots(req, res, next) {
    try {
      const { canchaId } = req.params;
      const { fecha } = req.query;
      const data = await disponibilidadService.getAvailableSlots(canchaId, fecha);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DisponibilidadController();
