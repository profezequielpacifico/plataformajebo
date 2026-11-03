const { Router } = require('express');
const { body } = require('express-validator');
const etapaController = require('../controllers/etapa.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, etapaController.findAll);

router.get('/torneo/:torneoId', authenticate, etapaController.findByTorneo);

router.get('/:id', authenticate, etapaController.findById);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_torneo').isInt().withMessage('Torneo es requerido'),
  body('orden').isInt().withMessage('Orden es requerido'),
  body('descripcion').optional().isString(),
  body('fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('estado').optional().isIn(['Pendiente', 'En Progreso', 'Finalizada', 'Cancelada']).withMessage('Estado inválido')
], validate, etapaController.create);

router.post('/torneo/:torneoId', authenticate, requireAdminOrAbove, [
  body('etapas').optional().isArray({ min: 1 }).withMessage('Debe haber al menos una etapa'),
  body('etapas.*.nombre').optional().notEmpty().withMessage('Nombre de etapa es requerido'),
  body('etapas.*.orden').optional().isInt({ min: 1 }).withMessage('Orden debe ser un entero positivo')
], validate, etapaController.createForTorneo);

router.put('/torneo/:torneoId', authenticate, requireAdminOrAbove, [
  body('etapas').optional().isArray().withMessage('Etapas debe ser un arreglo')
], validate, etapaController.syncForTorneo);

router.put('/:id', authenticate, requireAdminOrAbove, [
  body('nombre').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('descripcion').optional().isString(),
  body('fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('estado').optional().isIn(['Pendiente', 'En Progreso', 'Finalizada', 'Cancelada']).withMessage('Estado inválido')
], validate, etapaController.update);

router.delete('/:id', authenticate, requireAdminOrAbove, etapaController.delete);

module.exports = router;
