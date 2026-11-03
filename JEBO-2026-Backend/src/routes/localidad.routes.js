const { Router } = require('express');
const { body } = require('express-validator');
const localidadController = require('../controllers/localidad.controller');
const { authenticate, requireSuperAdmin, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, localidadController.findAll);
router.get('/:id', authenticate, localidadController.findById);

router.post('/', authenticate, requireSuperAdmin, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_distrito').isInt().withMessage('Distrito es requerido'),
  body('id_region').isInt().withMessage('Región es requerida')
], validate, localidadController.create);

router.put('/:id', authenticate, requireSuperAdmin, localidadController.update);
router.delete('/:id', authenticate, requireSuperAdmin, localidadController.delete);

module.exports = router;
