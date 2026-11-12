const { HTTP_STATUS } = require('../constants');
const etapaInstanciaService = require('../services/etapa-instancia.service');
const { formatResponse, bindAll } = require('../utils');

class EtapaInstanciaController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async listarPorTorneo(req, res, next) {
    try {
      const data = await etapaInstanciaService.listarPorTorneo(req.params.torneoId);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async detalle(req, res, next) {
    try {
      const data = await etapaInstanciaService.detalle(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async preparar(req, res, next) {
    try {
      const data = await etapaInstanciaService.preparar(req.params.etapaId, this._context(req), req.body?.zonas || null);
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Etapa preparada'));
    } catch (err) {
      next(err);
    }
  }

  async generarEncuentros(req, res, next) {
    try {
      const data = await etapaInstanciaService.generarEncuentros(req.params.id, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Encuentros generados'));
    } catch (err) {
      next(err);
    }
  }

  async agregarParticipante(req, res, next) {
    try {
      const data = await etapaInstanciaService.agregarParticipante(req.params.id, req.body.id_equipo, this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Equipo agregado'));
    } catch (err) {
      next(err);
    }
  }

  async finalizar(req, res, next) {
    try {
      const data = await etapaInstanciaService.finalizar(req.params.id, req.body.desempate, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Instancia finalizada'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EtapaInstanciaController();
