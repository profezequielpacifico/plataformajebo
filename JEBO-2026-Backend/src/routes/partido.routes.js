const { Router } = require('express');
const { body, query } = require('express-validator');
const partidoController = require('../controllers/partido.controller');
const { authenticate, requireAdminOrAbove, operarPartido, validate } = require('../middleware');
const { ESTADOS_PARTIDO } = require('../constants');

// Los valores salen de la constante y no de una lista repetida en cada

const ESTADOS_VALIDOS = Object.values(ESTADOS_PARTIDO);

/**
 * Un campo opcional que tolera el `""` que mandan los formularios.
 *
 * Un `<select>` sin opcion elegida viaja como `""`, no como `null`. `optional()`
 * acepta `undefined` y `optional({ nullable: true })` acepta `null`, pero
 * ninguno de los dos acepta `""`, asi que el validador de abajo lo rechazaba con
 * un 400 cuyo mensaje es literalmente "Invalid value": no dice que campo fallo,
 * ni por que, ni que deberia mandarse vacio.
 *
 * `checkFalsy` cubre `""`, `null` y `undefined` en una sola opcion. La unica
 * concession es que tambien se salta `0`, y para un id eso no es un caso real:
 * los ids arrancan en 1. Un `0` de todos modos no llego lejos —la FK lo
 * rechazaba— asi que lo que se pierde es el mensaje, no la garantia.
 */
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

// Vista en vivo: partido, marcador derivado, reloj y arbitros en una sola

router.get('/:id/live', authenticate, partidoController.findLive);

router.post('/', authenticate, requireAdminOrAbove, [
  body('id_torneo').isInt().withMessage('Torneo es requerido'),
  body('id_equipo_local').isInt().withMessage('Equipo local es requerido'),
  body('id_equipo_visitante').isInt().withMessage('Equipo visitante es requerido')
], validate, partidoController.create);

// Se exporta la cadena aparte del router porque su comportamiento es

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

// El marcador ya no se manda. El body se acepta y se ignora para que un

router.patch('/:id/result', authenticate, operarPartido, [], validate, partidoController.updateResult);

router.patch('/:id/status', authenticate, operarPartido, [
  body('estado').isIn(ESTADOS_VALIDOS).withMessage('Estado inválido')
], validate, partidoController.updateStatus);

router.delete('/:id', authenticate, requireAdminOrAbove, partidoController.delete);

module.exports = router;
module.exports.VALIDACION_UPDATE = VALIDACION_UPDATE;
