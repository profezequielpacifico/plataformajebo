const express = require('express');
const router = express.Router();
const { authenticate, gestionarPresentacion, evaluarPresentacion } = require('../middleware');
const {
  body,
  param,
  query,
  validationResult
} = require('express-validator');
const {
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
} = require('../controllers/presentacion.controller');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validaciones
const validarPresentacion = [
  body('id_torneo').isInt({ min: 1 }).withMessage('id_torneo requerido'),
  body('id_disciplina').isInt({ min: 1 }).withMessage('id_disciplina requerido'),
  body('orden').isInt({ min: 1 }).withMessage('orden requerido'),
  body('fecha_hora').optional().isISO8601().withMessage('fecha_hora inválida'),
  body('id_disponibilidad').optional().isInt().withMessage('id_disponibilidad inválido'),
  body('participantes').optional().isArray().withMessage('participantes debe ser array'),
  body('participantes.*.id_equipo').isInt().withMessage('id_equipo requerido'),
  body('participantes.*.rol').isIn(['INDIVIDUAL', 'PAREJA', 'GRUPO']).withMessage('rol inválido'),
  body('participantes.*.orden_salida').isInt().withMessage('orden_salida requerido'),
  body('staff').optional().isArray().withMessage('staff debe ser array'),
  body('staff.*.id_usuario').isInt().withMessage('id_usuario requerido'),
  body('staff.*.rol').isIn(['JUEZ_PRESIDENTE', 'JUEZ', 'SECRETARIO']).withMessage('rol de staff inválido'),
  validate
];

const validarEstado = [
  body('estado').isIn(['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA']).withMessage('Estado inválido'),
  validate
];

const validarEvaluacion = [
  body('id_participante_equipo').isInt({ min: 1 }).withMessage('id_participante_equipo requerido'),
  body('coord_1').isInt({ min: 1, max: 5 }).withMessage('coord_1 1-5'),
  body('desem_1').isInt({ min: 1, max: 5 }).withMessage('desem_1 1-5'),
  body('coord_2').isInt({ min: 1, max: 5 }).withMessage('coord_2 1-5'),
  body('desem_2').isInt({ min: 1, max: 5 }).withMessage('desem_2 1-5'),
  body('coord_3').isInt({ min: 1, max: 5 }).withMessage('coord_3 1-5'),
  body('desem_3').isInt({ min: 1, max: 5 }).withMessage('desem_3 1-5'),
  body('coord_4').isInt({ min: 1, max: 5 }).withMessage('coord_4 1-5'),
  body('desem_4').isInt({ min: 1, max: 5 }).withMessage('desem_4 1-5'),
  body('observaciones').optional().isString(),
  validate
];

// Todas requieren autenticación
router.use(authenticate);

// Listado. El admin ve la jornada completa; un juez, solo los encuentros donde

router.get('/', evaluarPresentacion, list);

// Admin: crear, actualizar, eliminar
router.post('/', gestionarPresentacion, validarPresentacion, create);
router.get('/:id', gestionarPresentacion, getById);
router.put('/:id', gestionarPresentacion, validarPresentacion, update);
router.delete('/:id', gestionarPresentacion, remove);

// Estado (Comenzar / Finalizar). Solo administracion: el juez carga su hoja, pero

router.patch('/:id/estado', gestionarPresentacion, validarEstado, updateEstado);

// Resultado - admin
router.get('/:id/resultado', gestionarPresentacion, getResultado);
router.post('/:id/calcular-resultado', gestionarPresentacion, calcularResultado);
router.get('/:id/validar-cierre', gestionarPresentacion, validarCierre);

// Detalle para evaluación - administracion y jueces del jurado de esa presentación
router.get('/:id/detalle-evaluacion', evaluarPresentacion, getDetalleEvaluacion);

// Evaluaciones - el juez guarda su hoja. `evaluarPresentacion` en modo lectura

router.post('/:id/evaluaciones', evaluarPresentacion, validarEvaluacion, guardarEvaluacion);
router.get('/:id/evaluaciones', evaluarPresentacion, getEvaluacionesJuez);

module.exports = router;