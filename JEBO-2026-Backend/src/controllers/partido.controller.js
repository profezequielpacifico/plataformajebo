const { HTTP_STATUS } = require('../constants');
const partidoService = require('../services/partido.service');
const { formatResponse, formatPaginatedResponse, soloCampos, bindAll } = require('../utils');

// `id_disponibilidad` no entra por acá: la resuelve el servicio a partir de

const CAMPOS_PARTIDO = [
  'id_torneo',
  'id_equipo_local',
  'id_equipo_visitante',
  'estado',
  'fecha',
  'hora',
  'id_cancha',
  'arbitros'

];

class PartidoController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return {
      userId: req.user?.id,
      rol: req.user?.rol,
      alcance: req.alcance,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
  }

  async findAll(req, res, next) {
    try {
      const { page, limit, id_torneo, id_equipo, fecha_desde, fecha_hasta, estado } = req.query;
      const result = await partidoService.findAll({
        page, limit, id_torneo, id_equipo, fecha_desde, fecha_hasta, estado,
        // Aislamiento por institución (X-05): el partido es visible si alguno de

        alcance: req.alcance
      });
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }

  async findMios(req, res, next) {
    try {
      const { page, limit, id_torneo, id_disciplina, estado } = req.query;
      const result = await partidoService.findMios(
        { page, limit, id_torneo, id_disciplina, estado, alcance: req.alcance },
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await partidoService.findById(req.params.id, { alcance: req.alcance });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await partidoService.create(soloCampos(req, CAMPOS_PARTIDO), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Partido creado'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await partidoService.update(req.params.id, soloCampos(req, CAMPOS_PARTIDO), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Partido actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async findLive(req, res, next) {
    try {
      const data = await partidoService.findLive(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async updateResult(req, res, next) {
    try {
      const data = await partidoService.updateResult(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Resultado cerrado desde el historial'));
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { estado } = req.body;
      const data = await partidoService.updateStatus(req.params.id, estado, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Estado actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await partidoService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Partido eliminado'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PartidoController();
