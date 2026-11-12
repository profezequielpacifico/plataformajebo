const { Router } = require('express');
const { body, query } = require('express-validator');
const canchaController = require('../controllers/cancha.controller');
const disponibilidadController = require('../controllers/disponibilidad.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, canchaController.findAll);
router.get('/horarios', authenticate, canchaController.getHorarios);
router.get('/:id', authenticate, canchaController.findById);
router.get('/:canchaId/disponibilidad', authenticate, [
  query('fecha').notEmpty().withMessage('Fecha es requerida')
], validate, disponibilidadController.getAvailableSlots);
router.get('/:id/schedule', authenticate, canchaController.getSchedule);

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d(:00)?$/;

router.post('/horarios', authenticate, requireAdminOrAbove, [
  body('horarios').isArray({ min: 1, max: 96 }).withMessage('horarios debe ser una lista de 1 a 96 elementos'),
  body('horarios.*.hora_inicio').matches(HORA_HHMM).withMessage('hora_inicio debe tener formato HH:MM'),
  body('horarios.*.hora_fin').matches(HORA_HHMM).withMessage('hora_fin debe tener formato HH:MM')
], validate, canchaController.createHorarios);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_distrito').isInt().withMessage('Distrito es requerido')
], validate, canchaController.create);

router.put('/:id', authenticate, requireAdminOrAbove, canchaController.update);

router.put('/:id/schedule', authenticate, requireAdminOrAbove, [
  body('items').isArray().withMessage('items debe ser un arreglo')
], validate, canchaController.updateSchedule);

router.delete('/:id', authenticate, requireAdminOrAbove, canchaController.delete);

module.exports = router;
