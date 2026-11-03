const { HTTP_STATUS } = require('../constants');
const institucionService = require('../services/institucion.service');
const { formatResponse, bindAll } = require('../utils');

class InstitucionController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, alcance: req.alcance, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const data = await institucionService.findAll(req.alcance);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await institucionService.findById(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await institucionService.create(req.body, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Institución creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await institucionService.update(req.params.id, req.body, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Institución actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await institucionService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Institución eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InstitucionController();
