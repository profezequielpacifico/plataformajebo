const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/configuracion_puntaje.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, controller.findAll);
router.get('/:id', authenticate, controller.findById);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('tipo').notEmpty().withMessage('Tipo es requerido'),
  body('configuracion_json').isObject().withMessage('Configuración JSON es requerida')
], validate, controller.create);

router.put('/:id', authenticate, requireAdminOrAbove, controller.update);
router.delete('/:id', authenticate, requireAdminOrAbove, controller.delete);

module.exports = router;
