const { Router } = require('express');
const { body } = require('express-validator');
const competenciaController = require('../controllers/competencia.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, competenciaController.findAll);
router.get('/:id', authenticate, competenciaController.findById);
router.get('/:id/etapas', authenticate, competenciaController.findEtapas);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('estado').optional().isIn(['BORRADOR', 'CONFIGURADA', 'EN_CURSO', 'FINALIZADA', 'SUSPENDIDA']),
  body('etapas').optional().isArray(),
  body('etapas.*.nombre').optional().notEmpty(),
  body('etapas.*.orden').optional().isInt({ min: 1 })
], validate, competenciaController.create);

router.post('/:etapaId/evaluar', authenticate, requireAdminOrAbove, competenciaController.evaluarEtapa);
router.get('/:etapaId/participantes', authenticate, competenciaController.findParticipantes);

router.post('/:etapaId/generar-participantes', authenticate, requireAdminOrAbove, [
  body('participantes').isArray({ min: 1 }).withMessage('Se requiere al menos un participante'),
  body('participantes.*.equipo_id').isInt().withMessage('equipo_id debe ser un entero')
], validate, competenciaController.generarParticipantes);

module.exports = router;
