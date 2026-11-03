const { HTTP_STATUS } = require('../constants');
const instanciaService = require('../services/instancia.service');
const { formatResponse, formatPaginatedResponse, bindAll, soloCampos } = require('../utils');

const CAMPOS_INSTANCIA = ['descripcion_instancia'];

class InstanciaController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const { limit, offset, search } = req.query;
      const result = await instanciaService.findAll({ limit, offset, search });
      if (limit) {
        res.status(HTTP_STATUS.OK).json(formatPaginatedResponse(result.data, result.total, result.page, result.limit));
      } else {
        res.status(HTTP_STATUS.OK).json(formatResponse(result.data));
      }
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await instanciaService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await instanciaService.create(soloCampos(req, CAMPOS_INSTANCIA), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Instancia creada'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await instanciaService.update(req.params.id, soloCampos(req, CAMPOS_INSTANCIA), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Instancia actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await instanciaService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Instancia eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InstanciaController();
