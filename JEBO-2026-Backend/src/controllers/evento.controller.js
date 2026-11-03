const { HTTP_STATUS } = require('../constants');
const { eventoService, relojService } = require('../services/evento.service');
const { formatResponse, formatPaginatedResponse, soloCampos, bindAll } = require('../utils');

/**
 * El body del registro de un evento tiene exactamente tres campos.
 *
 * Lo que NO esta en esta lista es lo importante: `hora_real`, `segundos_partido`
 * y `estado` no los manda el cliente. Si los aceptara, un arbitro podria
 * retroadatar un gol o reversible al instante; y el tiempo de partido tiene que
 * salir de la misma lectura de reloj que escribe `hora_real`, o cada evento
 * tendria dos marcas de tiempo de relojes distintos.
 */
const CAMPOS_EVENTO = [
  'id_equipo',
  'id_usuario_arbitro',
  'idempotency_key'
];

const CAMPOS_ANULACION = ['motivo_anulacion'];

class EventoController {
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

  async registrar(req, res, next) {
    try {
      const data = await eventoService.registrar(
        req.params.id,
        soloCampos(req, CAMPOS_EVENTO),
        this._context(req)
      );
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Evento registrado'));
    } catch (err) {
      next(err);
    }
  }

  async findByPartido(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await eventoService.findByPartido(
        req.params.id,
        { page, limit },
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(
        formatPaginatedResponse(result.data, result.total, result.page, result.limit)
      );
    } catch (err) {
      next(err);
    }
  }

  async anular(req, res, next) {
    try {
      const data = await eventoService.anular(
        req.params.id,
        req.params.idEvento,
        soloCampos(req, CAMPOS_ANULACION),
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Evento anulado'));
    } catch (err) {
      next(err);
    }
  }

  async relojAccion(req, res, next) {
    try {
      const data = await relojService.accion(
        req.params.id,
        req.body?.accion,
        this._context(req)
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Reloj actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async relojEstado(req, res, next) {
    try {
      const data = await relojService.estado(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new EventoController();
