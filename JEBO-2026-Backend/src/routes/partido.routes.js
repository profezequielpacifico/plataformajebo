const { Router } = require('express');
const { body, query } = require('express-validator');
const partidoController = require('../controllers/partido.controller');
const { authenticate, requireAdminOrAbove, operarPartido, validate } = require('../middleware');
const { ESTADOS_PARTIDO } = require('../constants');

const ESTADOS_VALIDOS = Object.values(ESTADOS_PARTIDO);

const opcional = (campo) => body(campo).optional({ checkFalsy: true });

const enteroOpcional = (campo) => opcional(campo).isInt();

const router = Router();

router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('id_torneo').optional().isInt(),
  query('estado').optional().isString().withMessage('Estado inválido')
], validate, partidoController.findAll);

router.get('/mios', authenticate, operarPartido, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('id_torneo').optional().isInt(),
  query('id_disciplina').optional().isInt(),
  query('estado').optional().isString().withMessage('Estado inválido')
], validate, partidoController.findMios);

router.get('/:id', authenticate, partidoController.findById);

router.get('/:id/live', authenticate, partidoController.findLive);

router.post('/', authenticate, requireAdminOrAbove, [
  body('id_torneo').isInt().withMessage('Torneo es requerido'),
  body('id_equipo_local').isInt().withMessage('Equipo local es requerido'),
  body('id_equipo_visitante').isInt().withMessage('Equipo visitante es requerido')
], validate, partidoController.create);

const VALIDACION_UPDATE = [
  enteroOpcional('id_torneo'),
  enteroOpcional('id_equipo_local'),
  enteroOpcional('id_equipo_visitante'),
  opcional('estado').isIn(ESTADOS_VALIDOS),
  enteroOpcional('id_cancha'),
  opcional('arbitros').isArray()
];

router.put('/:id', authenticate, requireAdminOrAbove,
  VALIDACION_UPDATE, validate, partidoController.update);

router.patch('/:id/result', authenticate, operarPartido, [], validate, partidoController.updateResult);

router.patch('/:id/status', authenticate, operarPartido, [
  body('estado').isIn(ESTADOS_VALIDOS).withMessage('Estado inválido')
], validate, partidoController.updateStatus);

router.delete('/:id', authenticate, requireAdminOrAbove, partidoController.delete);

module.exports = router;
module.exports.VALIDACION_UPDATE = VALIDACION_UPDATE;
