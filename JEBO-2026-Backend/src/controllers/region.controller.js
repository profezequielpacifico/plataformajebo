const { HTTP_STATUS } = require('../constants');
const regionService = require('../services/region.service');
const { formatResponse, bindAll, soloCampos } = require('../utils');

const CAMPOS_REGION = ['nombre', 'descripcion'];

class RegionController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const data = await regionService.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await regionService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await regionService.create(soloCampos(req, CAMPOS_REGION), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Región creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await regionService.update(req.params.id, soloCampos(req, CAMPOS_REGION), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Región actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await regionService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Región eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RegionController();
