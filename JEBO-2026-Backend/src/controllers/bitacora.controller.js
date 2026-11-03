const { HTTP_STATUS } = require('../constants');
const bitacoraService = require('../services/bitacora.service');
const { formatPaginatedResponse } = require('../utils');

class BitacoraController {
  async findAll(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await bitacoraService.findAll({ page, limit });
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BitacoraController();
