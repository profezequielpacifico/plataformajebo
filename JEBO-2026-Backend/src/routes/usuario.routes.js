const { Router } = require('express');
const { body, query } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const { authenticate, requireSuperAdmin, requireAdminOrAbove, validate } = require('../middleware');
const { passwordValidator, documentoValidator, rolExisteValidator } = require('../utils');
const { ESTADOS_USUARIO, ROLES } = require('../constants');

const ESTADO_VALIDO = Object.values(ESTADOS_USUARIO);

const ROLES_OPCIONES = Object.values(ROLES).filter(
  (rol) => rol !== ROLES.SUPERADMIN && rol !== ROLES.ADMIN
);

const router = Router();

router.get('/opciones', authenticate, requireAdminOrAbove, [
  query('rol').optional().isIn(ROLES_OPCIONES)
], validate, usuarioController.opciones);

router.get('/', authenticate, requireSuperAdmin, [
  query('rol').optional().isString(),
  query('search').optional().isString()
], validate, usuarioController.findAll);

router.get('/:id', authenticate, requireSuperAdmin, usuarioController.findById);

router.post('/', authenticate, requireAdminOrAbove, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('documento').custom(documentoValidator),
  body('password').custom(passwordValidator),
  body('rol').optional().custom(rolExisteValidator)
], validate, usuarioController.create);

router.put('/:id', authenticate, requireAdminOrAbove, [
  body('nombre').optional().notEmpty(),
  body('email').optional().trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('documento').optional().custom(documentoValidator),
  body('password').optional().custom(passwordValidator),
  body('rol').optional().custom(rolExisteValidator),
  body('estado').optional().isIn(ESTADO_VALIDO).withMessage(`Estado inválido: se espera ${ESTADO_VALIDO.join(' o ')}`)
], validate, usuarioController.update);

router.delete('/:id', authenticate, requireAdminOrAbove, usuarioController.delete);

module.exports = router;
