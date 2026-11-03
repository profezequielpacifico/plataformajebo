const { Router } = require('express');
const { body } = require('express-validator');
const disciplinaController = require('../controllers/disciplina.controller');
const { authenticate, requireAdminOrAbove, validate, verificarContenido } = require('../middleware');
const { uploadReglamento, limitarCuerpo } = require('../config/upload');

const router = Router();

router.get('/', authenticate, disciplinaController.findAll);
router.get('/:id', authenticate, disciplinaController.findById);
router.get('/:id/reglamento', authenticate, disciplinaController.downloadReglamento);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('jugadores_por_equipo').optional().isInt({ min: 1 }),
  body('tipo_competencia').optional().isIn(['MARCADOR', 'EVALUACION'])
    .withMessage('Tipo de competencia inválido')
], validate, disciplinaController.create);

// `verificarContenido` va DESPUÉS de multer porque los magic bytes necesitan el

router.post('/:id/reglamento', authenticate, requireAdminOrAbove, limitarCuerpo, uploadReglamento.single('reglamento'), verificarContenido, disciplinaController.uploadReglamento);

router.put('/:id', authenticate, requireAdminOrAbove, [
  body('nombre').optional().notEmpty(),
  body('jugadores_por_equipo').optional().isInt({ min: 1 }),
  body('tipo_competencia').optional().isIn(['MARCADOR', 'EVALUACION'])
    .withMessage('Tipo de competencia inválido')
], validate, disciplinaController.update);

router.delete('/:id', authenticate, requireAdminOrAbove, disciplinaController.delete);

module.exports = router;
