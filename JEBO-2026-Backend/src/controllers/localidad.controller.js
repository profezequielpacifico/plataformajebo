const { HTTP_STATUS } = require('../constants');
const localidadService = require('../services/localidad.service');
const { formatResponse, bindAll, soloCampos } = require('../utils');

const CAMPOS_LOCALIDAD = ['id_distrito', 'nombre', 'codigo', 'id_region'];

class LocalidadController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const { id_distrito } = req.query;
      const data = await localidadService.findAll(id_distrito);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await localidadService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await localidadService.create(soloCampos(req, CAMPOS_LOCALIDAD), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Localidad creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await localidadService.update(req.params.id, soloCampos(req, CAMPOS_LOCALIDAD), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Localidad actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await localidadService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Localidad eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LocalidadController();
