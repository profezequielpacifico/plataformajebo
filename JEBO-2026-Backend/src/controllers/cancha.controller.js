const { HTTP_STATUS } = require('../constants');
const canchaService = require('../services/cancha.service');
const { formatResponse, bindAll } = require('../utils');

class CanchaController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const data = await canchaService.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await canchaService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await canchaService.create(req.body, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Cancha creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await canchaService.update(req.params.id, req.body, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Cancha actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async getHorarios(req, res, next) {
    try {
      const data = await canchaService.getHorarios();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async createHorarios(req, res, next) {
    try {
      const data = await canchaService.createHorarios(req.body.horarios, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Horarios creados'));
    } catch (err) {
      next(err);
    }
  }

  async getSchedule(req, res, next) {
    try {
      const data = await canchaService.getSchedule(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async updateSchedule(req, res, next) {
    try {
      const data = await canchaService.updateSchedule(req.params.id, req.body.items, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Horarios actualizados'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await canchaService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Cancha eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CanchaController();
