const { HTTP_STATUS } = require('../constants');
const usuarioService = require('../services/usuario.service');
const { formatResponse, soloCampos, bindAll } = require('../utils');
const { ForbiddenError } = require('../utils/errors');
const { puedeAdministrarUsuarios } = require('../services/alcance.service');

const CAMPOS_USUARIO = ['nombre', 'email', 'documento', 'password', 'rol', 'estado'];

class UsuarioController {
  constructor() {
    bindAll(this);
  }

  _context(req) {
    return { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] };
  }

  async findAll(req, res, next) {
    try {
      const { rol, search } = req.query;

      if (!puedeAdministrarUsuarios(req.alcance) && !rol) {
        return next(
          new ForbiddenError(
            'Indicá el rol a consultar (por ejemplo, ?rol=Profesor). ' +
            'Sin filtro solo puede listar usuarios SuperAdmin o Administrador.'
          )
        );
      }

      const data = await usuarioService.findAll(
        { rol, search },
        { alcance: req.alcance, solicitanteId: req.user.id_usuario }
      );
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async opciones(req, res, next) {
    try {
      const { rol } = req.query;
      const data = await usuarioService.findOpciones({ rol });
      const paraSelector = data.map((u) => ({
        id: u.id_usuario,
        nombre: u.nombre,
        rol: u.rol_descripcion
      }));
      res.status(HTTP_STATUS.OK).json(formatResponse(paraSelector));
    } catch (err) {
      next(err);
    }
  }

  async findById(req, res, next) {
    try {
      const data = await usuarioService.findById(req.params.id, {
        alcance: req.alcance,
        solicitanteId: req.user.id_usuario
      });
      res.status(HTTP_STATUS.OK).json(formatResponse(data));
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const data = await usuarioService.create(soloCampos(req, CAMPOS_USUARIO), this._context(req));
      res.status(HTTP_STATUS.CREATED).json(formatResponse(data, 'Usuario creado'));
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await usuarioService.update(req.params.id, soloCampos(req, CAMPOS_USUARIO), this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(data, 'Usuario actualizado'));
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await usuarioService.delete(req.params.id, this._context(req));
      res.status(HTTP_STATUS.OK).json(formatResponse(null, 'Usuario eliminado'));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsuarioController();
