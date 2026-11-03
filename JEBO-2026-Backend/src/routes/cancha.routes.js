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
