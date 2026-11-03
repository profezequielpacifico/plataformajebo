const { HTTP_STATUS } = require('../constants');
const { formatResponse, bindAll } = require('../utils');
const inscripcionService = require('../services/inscripcion.service');
const bitacoraService = require('../services/bitacora.service');

class InscripcionController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async cerrarVencidas(req, res, next) {
    try {
      const ctx = this._context(req);
      const data = await inscripcionService.cerrarVencidas();

      await bitacoraService.log({
        userId: ctx.userId,
        action: 'CERRAR_INSCRIPCIONES',
        entity: 'Inscripciones',
        detail: { transicionados: data },
        ip: ctx.ip,
        userAgent: ctx.userAgent
      });

      res.status(HTTP_STATUS.OK).json(formatResponse(data, data.length ? 'Inscripciones vencidas cerradas' : 'No hay inscripciones vencidas'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InscripcionController();