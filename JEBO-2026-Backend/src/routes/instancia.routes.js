const { Router } = require('express');
const { body } = require('express-validator');
const instanciaController = require('../controllers/instancia.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, instanciaController.findAll);
router.get('/:id', authenticate, instanciaController.findById);

router.post('/', authenticate, requireAdminOrAbove, [
  body('descripcion_instancia').notEmpty().withMessage('Descripción es requerida')
], validate, instanciaController.create);

router.put('/:id', authenticate, requireAdminOrAbove, instanciaController.update);
router.delete('/:id', authenticate, requireAdminOrAbove, instanciaController.delete);

module.exports = router;
