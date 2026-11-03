const { Router } = require('express');
const { body } = require('express-validator');
const distritoController = require('../controllers/distrito.controller');
const { authenticate, requireSuperAdmin, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, distritoController.findAll);
router.get('/:id', authenticate, distritoController.findById);

router.post('/', authenticate, requireSuperAdmin, [
  body('nombre').notEmpty().withMessage('Nombre es requerido')
], validate, distritoController.create);

router.put('/:id', authenticate, requireSuperAdmin, distritoController.update);
router.delete('/:id', authenticate, requireSuperAdmin, distritoController.delete);

module.exports = router;
