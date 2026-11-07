const { HTTP_STATUS } = require('../constants');
const etapaService = require('../services/etapa.service');
const { formatResponse, bindAll, soloCampos } = require('../utils');

const CAMPOS_ETAPA = [
  'id_torneo', 'nombre', 'orden', 'descripcion', 'estado', 'fecha_inicio', 'fecha_fin', 'tipo', 'es_final',
  'ambito', 'origen_tipo', 'origen_ambito', 'id_etapa_origen', 'clasifican_por_instancia',
  'mejores_adicionales', 'territorios_por_instancia', 'avanza_si_unico'
];

class EtapaController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const { id_torneo } = req.query;
      const data = await etapaService.findAll(id_torneo);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await etapaService.findById(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async findByTorneo(req, res, next) {
    try {
      const data = await etapaService.findAll(req.params.torneoId);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await etapaService.create(soloCampos(req, CAMPOS_ETAPA), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Etapa creada'));
    } catch (err) {
      next(err);
    }
  }

  async createForTorneo(req, res, next) {
    try {
      const data = await etapaService.createForTorneo(
        parseInt(req.params.torneoId, 10),
        soloCampos(req, CAMPOS_ETAPA),
        this._context(req)
      );
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Etapas creadas'));
    } catch (err) {
      next(err);
    }
  }

  async syncForTorneo(req, res, next) {
    try {
      const data = await etapaService.syncForTorneo(
        parseInt(req.params.torneoId, 10),
        soloCampos(req, CAMPOS_ETAPA),
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Etapas actualizadas'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await etapaService.update(req.params.id, soloCampos(req, CAMPOS_ETAPA), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Etapa actualizada'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await etapaService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Etapa eliminada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EtapaController();
