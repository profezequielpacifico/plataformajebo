const { Router } = require('express');
const { body, query } = require('express-validator');
const torneoController = require('../controllers/torneo.controller');
const posicionController = require('../controllers/posicion.controller');
const { authenticate, requireAdminOrAbove, validate, verificarContenido } = require('../middleware');
const { uploadReglamento, limitarCuerpo } = require('../config/upload');

const router = Router();

router.get('/', authenticate, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('scope').optional().isIn(['active', 'archived', 'inscripciones_abiertas']).withMessage('Scope debe ser active, archived o inscripciones_abiertas')
], validate, torneoController.findAll);

router.get('/:id', authenticate, torneoController.findById);
router.get('/:id/standings', authenticate, posicionController.findByTorneo);
router.get('/:id/qualified', authenticate, torneoController.findQualified);
router.get('/:id/final', authenticate, torneoController.findFinal);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_disciplina').isInt().withMessage('Disciplina es requerida'),
  body('fecha_inscripcion_inicio').optional().isISO8601().withMessage('Fecha de inicio de inscripción inválida'),
  body('fecha_inscripcion_fin').optional().isISO8601().withMessage('Fecha de fin de inscripción inválida'),
  body('etapas').optional().isArray({ min: 1 }).withMessage('Debe haber al menos una etapa'),
  body('etapas.*.nombre').optional().notEmpty().withMessage('Nombre de etapa es requerido'),
  body('etapas.*.orden').optional().isInt({ min: 1 }).withMessage('Orden debe ser un entero positivo'),
  body('etapas.*.fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('etapas.*.fecha_fin').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('etapas.*.estado').optional().isIn(['Pendiente', 'En Progreso', 'Finalizada', 'Cancelada']).withMessage('Estado de etapa inválido')
], validate, torneoController.create);

router.put('/:id', authenticate, requireAdminOrAbove, [
  body('fecha_inscripcion_inicio').optional().isISO8601().withMessage('Fecha de inicio de inscripción inválida'),
  body('fecha_inscripcion_fin').optional().isISO8601().withMessage('Fecha de fin de inscripción inválida'),
  body('etapas').optional().isArray().withMessage('Etapas debe ser un arreglo'),
  body('etapas.*.nombre').optional().notEmpty().withMessage('Nombre de etapa es requerido'),
  body('etapas.*.orden').optional().isInt({ min: 1 }).withMessage('Orden debe ser un entero positivo'),
  body('etapas.*.fecha_inicio').optional().isISO8601().withMessage('Fecha de inicio inválida'),
  body('etapas.*.fecha_fin').optional().isISO8601().withMessage('Fecha de fin inválida'),
  body('etapas.*.estado').optional().isIn(['Pendiente', 'En Progreso', 'Finalizada', 'Cancelada']).withMessage('Estado de etapa inválido')
], validate, torneoController.update);

router.delete('/:id', authenticate, requireAdminOrAbove, torneoController.delete);
// Mismo pipeline que los reglamentos de disciplina: `limitarCuerpo` corta por

router.post('/:id/reglamento', authenticate, requireAdminOrAbove, limitarCuerpo, uploadReglamento.single('reglamento'), verificarContenido, torneoController.uploadReglamento);

module.exports = router;
