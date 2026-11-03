const { HTTP_STATUS } = require('../constants');
const distritoService = require('../services/distrito.service');
const { formatResponse, bindAll, soloCampos } = require('../utils');

const CAMPOS_DISTRITO = ['nombre', 'codigo'];

class DistritoController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const data = await distritoService.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await distritoService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await distritoService.create(soloCampos(req, CAMPOS_DISTRITO), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Distrito creado'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await distritoService.update(req.params.id, soloCampos(req, CAMPOS_DISTRITO), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Distrito actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await distritoService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Distrito eliminado'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DistritoController();
