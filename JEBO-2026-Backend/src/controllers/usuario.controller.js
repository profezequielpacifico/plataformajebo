const { HTTP_STATUS } = require('../constants');
const usuarioService = require('../services/usuario.service');
const { formatResponse, soloCampos, bindAll } = require('../utils');
const { ForbiddenError } = require('../utils/errors');
const { puedeAdministrarUsuarios } = require('../services/alcance.service');

// Allowlist del body. `id_rol` no entra por acá a propósito: el servicio lo

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
      // Traduccion de la invariante del repositorio a un 403 (F1.1).

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

  /**
   * `GET /users/opciones` — nombres para armar un jurado.
   *
   * Este endpoint reemplaza al `GET /users?rol=X` con el que los selectores
   * (`TeamFormPage` -> Profesor, `MatchFormPage` -> Arbitro,
   * `GymPresentationsPage` -> Juez) elegian a quien designar. La separacion
   * importa por dos motivos:
   *
   * 1. La autorizacion queda atada a la ruta y no a como el cliente arma la
   *    query. Con una sola ruta, que el servidor sirviera el padron dependia de
   *    si venia `?rol=`: dos contratos de seguridad en la misma URL.
   * 2. La proyeccion es fija y no depende del alcance: siempre
   *    `{ id, nombre, rol }`. Un selector necesita identificar a una persona, no
   *    saber su email, su documento ni cuando entro por ultima vez.
   *
   * El recorte a tres campos se hace en dos capas a proposito: la proyeccion
   * del repositorio es la primera, y este mapeo la segunda. No es redundancia
   * gratuita: `findOpciones` es un metodo publico del repositorio y cualquier
   * consumidor futuro que lo use hereda la proyeccion, pero este mapeo fija la
   * forma de la respuesta HTTP aunque la proyeccion cambie. Si alguien abre una
   * proyeccion nueva "porque un selector necesita mas datos", el test de forma
   * sigue exigiendo `{ id, nombre, rol }` y hay que cambiarlo a proposito.
   */
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
