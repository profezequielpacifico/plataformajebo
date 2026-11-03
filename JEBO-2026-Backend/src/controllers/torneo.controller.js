const { HTTP_STATUS } = require('../constants');
const torneoService = require('../services/torneo.service');
const { formatResponse, formatPaginatedResponse, soloCampos, bindAll } = require('../utils');

// El servicio solo saca `etapas` del payload; el resto pasaba entero al

const CAMPOS_TORNEO = [
  'id_disciplina',
  'nombre',
  'categoria',
  'fecha_inicio',
  'fecha_fin',
  'estado',
  'descripcion',
  'reglamento',
  'fecha_inscripcion_inicio',
  'fecha_inscripcion_fin',
  'etapas'
];

class TorneoController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, alcance: req.alcance, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const { page, limit, id_disciplina, estado, scope } = req.query;
      const result = await torneoService.findAll({
        page, limit, id_disciplina, estado, scope,
        // Aislamiento por institución (X-05), por participación en el torneo.
        alcance: req.alcance
      });
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await torneoService.findById(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await torneoService.create(soloCampos(req, CAMPOS_TORNEO), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Torneo creado'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await torneoService.update(req.params.id, soloCampos(req, CAMPOS_TORNEO), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Torneo actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await torneoService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Torneo eliminado'));
    } catch (err) {
      next(err);
    }
  }

  async findQualified(req, res, next) {
    try {
      const data = await torneoService.findQualified(req.params.id, req.query.limit || 4, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findFinal(req, res, next) {
    try {
      const data = await torneoService.findFinal(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async uploadReglamento(req, res, next) {
    try {
      // El alcance va por acá porque `findById` filtra por institución a través

      const torneo = await torneoService.findById(req.params.id, { alcance: req.alcance });
      if (!req.file) {
        const error = new Error('No se adjuntó ningún archivo');
        error.status = HTTP_STATUS.BAD_REQUEST;
        error.isOperational = true;
        throw error;
      }

      const reglamentoUrl = `/uploads/reglamentos/${req.file.filename}`;
      const data = await torneoService.uploadReglamento(torneo.id_torneo, reglamentoUrl, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Reglamento actualizado'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TorneoController();
