const { Router } = require('express');
const { body, query } = require('express-validator');
const equipoController = require('../controllers/equipo.controller');
const posicionController = require('../controllers/posicion.controller');
const { authenticate, gestionarEquipoPropio, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('filter').optional().isString(),
  query('id_torneo').optional().isInt(),
  query('id_region').optional().isInt(),
  query('id_distrito').optional().isInt(),
  query('id_localidad').optional().isInt()
], validate, equipoController.findAll);

router.get('/enrolled/list', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('id_torneo').optional().isInt(),
  query('id_disciplina').optional().isInt(),
  query('id_region').optional().isInt(),
  query('include_cerradas').optional().isIn(['true', 'false'])
], validate, equipoController.findEnrolled);

router.get('/:id', authenticate, equipoController.findById);

// El alta es de Administracion o del Profesor que queda como duenio. En el alta
// (sin `:id`) `gestionarEquipoPropio` mira solo el nivel: el recurso todavia no
// existe, asi que no hay propiedad que chequear. Quien garantiza que el equipo
// quede a nombre del Profesor que lo creo, su institucion, el maximo de 3
// equipos y el nombre unico entre los suyos es `equipo.service.create`.

router.post('/', authenticate, gestionarEquipoPropio, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_institucion').isInt().withMessage('Institución es requerida'),
  body('id_disciplina').isInt().withMessage('Disciplina es requerida'),
  body('id_localidad').optional().isInt(),
  body('id_usuario').optional().isInt()
], validate, equipoController.create);

// El lote no tiene `:id`: el permiso no depende de que exista un id en la ruta

router.post('/enroll-batch', authenticate, gestionarEquipoPropio, [
  body('registrations').isArray({ min: 1 }).withMessage('Debe haber al menos una inscripción'),
  body('registrations.*.id_equipo').isInt().withMessage('Equipo es requerido'),
  body('registrations.*.id_torneo').isInt().withMessage('Torneo es requerido')
], validate, equipoController.enrollBatch);

router.post('/:id/enroll', authenticate, gestionarEquipoPropio, [
  body('id_torneo').isInt().withMessage('Torneo es requerido')
], validate, equipoController.enroll);

router.put('/:id', authenticate, gestionarEquipoPropio, equipoController.update);
router.delete('/:id', authenticate, gestionarEquipoPropio, equipoController.delete);

module.exports = router;
