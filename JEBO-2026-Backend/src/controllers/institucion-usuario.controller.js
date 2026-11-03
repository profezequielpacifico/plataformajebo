const { HTTP_STATUS } = require('../constants');
const institucionUsuarioService = require('../services/institucion-usuario.service');
const { formatResponse, soloCampos, bindAll } = require('../utils');

/**
 * Asignación de usuarios a instituciones (el complemento de X-05).
 *
 * Las tres rutas son `requireAdminOrAbove`. Ver el encabezado de
 * `institucion-usuario.service` para por qué además revalida el rol del
 * servicio.
 */
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

  /**
   * `PUT` con la lista completa, no un `PATCH`. Editar un conjunto en un `PUT`
   * es idempotente: mandarlo dos veces deja el mismo estado, y el cliente no
   * necesita saber qué había antes para decidir qué mandar.
   *
   * Allowlist de un solo campo: `id_institucion` acepta un array, no un objeto
   * con campos libres, así que no hay nada más que filtrar acá — pero el
   * `soloCampos` mantiene la forma de las demás escrituras y evita que un campo
   * extra llegue al servicio.
   */
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
