const knex = require('../config/knex');
const { HTTP_STATUS } = require('../constants');
const { formatResponse, bindAll } = require('../utils');
const fixtureService = require('../services/fixture.service');
const bitacoraService = require('../services/bitacora.service');

class FixtureController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async getStatus(req, res, next) {
    try {
      const { id_torneo } = req.params;
      // `req.alcance` lo deja `authenticate`; sin él el servicio lanza (X-05).
      const data = await fixtureService.getByIdTorneo(id_torneo, req.alcance);
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async generate(req, res, next) {
    try {
      const { id_torneo } = req.body;
      const ctx = this._context(req);
      const data = await fixtureService.generate(id_torneo, ctx.userId);

      await bitacoraService.log({
        userId: ctx.userId,
        action: 'GENERAR_FIXTURE',
        entity: 'Fixture',
        entityId: id_torneo,
        detail: { torneo: data.torneo, partidos: data.partidos },
        ip: ctx.ip,
        userAgent: ctx.userAgent
      });

      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Fixture generado correctamente'));
    } catch (err) {
      next(err);
    }
  }

  async audit(req, res, next) {
    try {
      const rows = await knex('fixture_generado as f')
        .leftJoin('usuario as u', 'f.id_usuario', 'u.id_usuario')
        .leftJoin('torneo as t', 'f.id_torneo', 't.id_torneo')
        .select('f.id_fixture', 'f.id_torneo', 't.nombre as torneo', 'f.generado_en', 'u.nombre as usuario')
        .orderBy('f.generado_en', 'desc');
      res.status(HTTP_STATUS.OK).json(formatResponse(rows));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FixtureController();