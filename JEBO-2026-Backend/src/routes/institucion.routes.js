const { Router } = require('express');
const { body } = require('express-validator');
const institucionController = require('../controllers/institucion.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, institucionController.findAll);
router.get('/:id', authenticate, institucionController.findById);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('id_distrito').isInt().withMessage('Distrito es requerido')
], validate, institucionController.create);

router.put('/:id', authenticate, requireAdminOrAbove, institucionController.update);
router.delete('/:id', authenticate, requireAdminOrAbove, institucionController.delete);

module.exports = router;
