const { HTTP_STATUS } = require('../constants');
const publicService = require('../services/public.service');
const { formatResponse, bindAll } = require('../utils');

const entero = (valor) => (valor === undefined || valor === '' ? undefined : parseInt(valor, 10));

const lista = (valor) => {
  if (valor === undefined || valor === '') return undefined;
  const valores = Array.isArray(valor) ? valor : String(valor).split(',');
  return valores.map((v) => v.trim()).filter(Boolean);
};

const filtrosDe = (query) => ({
  id_region: entero(query.id_region),
  id_disciplina: entero(query.id_disciplina),
  id_torneo: entero(query.id_torneo),
  id_etapa: entero(query.id_etapa),
  desde: query.desde || undefined,
  hasta: query.hasta || undefined,
  estados: lista(query.estado),
  limite: entero(query.limite)
});

class PublicController {
  constructor() {
    bindAll(this);
  }

  async regiones(_req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.regiones()));
    } catch (err) {
      next(err);
    }
  }

  async disciplinas(_req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.disciplinas()));
    } catch (err) {
      next(err);
    }
  }

  async torneos(req, res, next) {
    try {
      const { id_region, id_disciplina } = filtrosDe(req.query);
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.torneos({ id_region, id_disciplina })));
    } catch (err) {
      next(err);
    }
  }

  async etapas(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.etapas(entero(req.params.id))));
    } catch (err) {
      next(err);
    }
  }

  async fixture(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.fixture(filtrosDe(req.query))));
    } catch (err) {
      next(err);
    }
  }

  async resumen(req, res, next) {
    try {
      res.status(HTTP_STATUS.OK).json(formatResponse(await publicService.resumen(filtrosDe(req.query))));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PublicController();
