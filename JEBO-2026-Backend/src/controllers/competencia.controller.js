const { HTTP_STATUS } = require('../constants');
const CompetitionOrchestrator = require('../services/competition.orchestrator');
const {
  CompetenciaRepository,
  CompetenciaEtapaRepository,
  EtapaParticipanteRepository,
  EtapaReglaRepository
} = require('../repositories');
const { formatResponse, bindAll } = require('../utils');

class CompetenciaController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return {
      userId: req.user?.id,
      alcance: req.alcance,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
  }

  async create(req, res, next) {
    try {
      const data = req.body;
      const context = this._context(req);
      const result = await CompetitionOrchestrator.crearCompetencia(data, context);
      res.status(HTTP_STATUS.CREATED).json(formatResponse(result, 'Competencia creada'));
    } catch (err) {
      next(err);
    }
  }

  async findAll(req, res, next) {
    try {
      const result = await CompetenciaRepository.findAll();
      res.status(HTTP_STATUS.OK).json(formatResponse(result));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const result = await CompetenciaRepository.findById(req.params.id);
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ error: 'Competencia no encontrada' });
      }
      res.status(HTTP_STATUS.OK).json(formatResponse(result));
    } catch (err) {
      next(err);
    }
  }

  async findEtapas(req, res, next) {
    try {
      const etapas = await CompetenciaEtapaRepository.findByCompetencia(req.params.id);
      res.status(HTTP_STATUS.OK).json(formatResponse(etapas));
    } catch (err) {
      next(err);
    }
  }

  async evaluarEtapa(req, res, next) {
    try {
      const result = await CompetitionOrchestrator.evaluarEtapa(req.params.etapaId);
      res.status(HTTP_STATUS.OK).json(formatResponse(result));
    } catch (err) {
      next(err);
    }
  }

  async generarParticipantes(req, res, next) {
    try {
      const { participantes } = req.body;
      const result = await CompetitionOrchestrator.generarParticipantesSiguienteEtapa(
        req.params.etapaId,
        participantes,
        this._context(req)
      );
      res.status(HTTP_STATUS.CREATED).json(formatResponse(result, 'Participantes generados'));
    } catch (err) {
      next(err);
    }
  }

  async findParticipantes(req, res, next) {
    try {
      const result = await EtapaParticipanteRepository.findByEtapa(req.params.etapaId);
      res.status(HTTP_STATUS.OK).json(formatResponse(result));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CompetenciaController();
