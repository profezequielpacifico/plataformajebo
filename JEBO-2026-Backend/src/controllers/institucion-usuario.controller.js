const { HTTP_STATUS } = require('../constants');
const institucionUsuarioService = require('../services/institucion-usuario.service');
const { formatResponse, soloCampos, bindAll } = require('../utils');

class InstitucionUsuarioController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async listar(req, res, next) {
    try {
      const data = await institucionUsuarioService.listarDe(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async reemplazar(req, res, next) {
    try {
      const data = await institucionUsuarioService.reemplazar(
        req.params.id,
        soloCampos(req, ['id_institucion']).id_institucion,
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Instituciones actualizadas'));
    } catch (err) {
      next(err);
    }
  }

  async asignar(req, res, next) {
    try {
      const data = await institucionUsuarioService.asignar(
        req.params.id,
        req.params.id_institucion,
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Institución asignada'));
    } catch (err) {
      next(err);
    }
  }

  async quitar(req, res, next) {
    try {
      const data = await institucionUsuarioService.quitar(
        req.params.id,
        req.params.id_institucion,
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Institución quitada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InstitucionUsuarioController();
