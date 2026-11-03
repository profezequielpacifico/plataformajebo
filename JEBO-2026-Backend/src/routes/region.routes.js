const { Router } = require('express');
const { body } = require('express-validator');
const regionController = require('../controllers/region.controller');
const { authenticate, requireSuperAdmin, validate } = require('../middleware');

const router = Router();

router.get('/', authenticate, regionController.findAll);
router.get('/:id', authenticate, regionController.findById);

router.post('/', authenticate, requireSuperAdmin, [
  body('nombre').notEmpty().withMessage('Nombre es requerido')
], validate, regionController.create);

router.put('/:id', authenticate, requireSuperAdmin, regionController.update);
router.delete('/:id', authenticate, requireSuperAdmin, regionController.delete);

module.exports = router;
