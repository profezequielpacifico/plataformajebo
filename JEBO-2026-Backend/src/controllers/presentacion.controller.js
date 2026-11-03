const presentacionService = require('../services/presentacion.service');
const evaluacionService = require('../services/evaluacion.service');
const { NotFoundError } = require('../utils/errors');

async function list(req, res, next) {
  try {
    const params = {
      id_torneo: req.query.id_torneo ? parseInt(req.query.id_torneo, 10) : undefined,
      estado: req.query.estado,
      id_disciplina: req.query.id_disciplina ? parseInt(req.query.id_disciplina, 10) : undefined,
      fecha_desde: req.query.fecha_desde,
      fecha_hasta: req.query.fecha_hasta,
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20
    };
    const data = await presentacionService.findAll(params, {
      userId: req.user.id_usuario,
      rol: req.user.rol
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await presentacionService.findById(id, {
      userId: req.user.id_usuario,
      rol: req.user.rol
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await presentacionService.create(req.body, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.status(201).json(data);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await presentacionService.update(id, req.body, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function updateEstado(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { estado } = req.body;
    if (!estado) return res.status(400).json({ error: 'Estado requerido' });

    const data = await presentacionService.updateEstado(id, estado, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await presentacionService.delete(id, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function getResultado(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await presentacionService.getResultado(id, {
      userId: req.user.id_usuario,
      rol: req.user.rol
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function getDetalleEvaluacion(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await presentacionService.getDetalleEvaluacion(id, {
      userId: req.user.id_usuario,
      rol: req.user.rol
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function guardarEvaluacion(req, res, next) {
  try {
    const id_presentacion = parseInt(req.params.id, 10);
    const data = await evaluacionService.guardarHoja({
      id_presentacion,
      ...req.body
    }, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function getEvaluacionesJuez(req, res, next) {
  try {
    const id_presentacion = parseInt(req.params.id, 10);
    // El juez es el que pregunta, no el que el cliente nombra (F1.5, §8.2).
    //
    // Antes aceptaba `?id_juez=` y, si venía, ganaba sobre el token. Con el guard
    // `evaluarPresentacion` el corte es de nivel y de jurado, pero elegir de
    // *qué* hoja leer sí venía del cliente: un juez del jurado de esa presentación
    // podía pedir las hojas de los demás jueces del mismo jurado y verlas
    // completas. El filtro de jurado no protege contra eso —el que entra es
    // jurado—, por eso el id tiene que salir del token y no de la query.
    //
    // Lo que se devuelve es "mis evaluaciones en esta presentación", que es lo que
    // la pantalla de evaluación necesita para habilitar el guardado.
    const id_juez = req.user.id_usuario;
    const data = await evaluacionService.getEvaluacionesPorJuez(id_presentacion, id_juez);
    res.json(data);
  } catch (err) { next(err); }
}

async function calcularResultado(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await evaluacionService.calcularResultado(id, {
      userId: req.user.id_usuario,
      rol: req.user.rol,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(data);
  } catch (err) { next(err); }
}

async function validarCierre(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = await evaluacionService.validarCierre(id);
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = {
  list,
  getById,
  create,
  update,
  updateEstado,
  remove,
  getResultado,
  getDetalleEvaluacion,
  guardarEvaluacion,
  getEvaluacionesJuez,
  calcularResultado,
  validarCierre
};