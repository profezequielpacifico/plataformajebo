const { HTTP_STATUS } = require('../constants');
const configuracionPuntajeService = require('../services/configuracion_puntaje.service');
const { formatResponse, bindAll } = require('../utils');

class ConfiguracionPuntajeController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const data = await configuracionPuntajeService.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await configuracionPuntajeService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await configuracionPuntajeService.create(req.body, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Configuración creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await configuracionPuntajeService.update(req.params.id, req.body, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Configuración actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await configuracionPuntajeService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Configuración eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConfiguracionPuntajeController();
