const { Router } = require('express');
const { body, query } = require('express-validator');
const usuarioController = require('../controllers/usuario.controller');
const { authenticate, requireSuperAdmin, requireAdminOrAbove, validate } = require('../middleware');
const { passwordValidator, documentoValidator, rolExisteValidator } = require('../utils');
const { ESTADOS_USUARIO, ROLES } = require('../constants');

// Lista cerrada, leída de la constante y no escrita a mano: los dos estados

const ESTADO_VALIDO = Object.values(ESTADOS_USUARIO);

// Roles que un Admin puede listar para armar un jurado. `SuperAdmin` y

const ROLES_OPCIONES = Object.values(ROLES).filter(
  (rol) => rol !== ROLES.SUPERADMIN && rol !== ROLES.ADMIN
);

const router = Router();

// `GET /users/opciones` — declararla ANTES de `/:id`, no despues.

router.get('/opciones', authenticate, requireAdminOrAbove, [
  query('rol').optional().isIn(ROLES_OPCIONES)
], validate, usuarioController.opciones);

// El padron completo es de SuperAdmin (F1.6).

router.get('/', authenticate, requireSuperAdmin, [
  query('rol').optional().isString(),
  query('search').optional().isString()
], validate, usuarioController.findAll);

// `GET /users/:id` es la pantalla de edicion de SuperAdmin, no un selector.

router.get('/:id', authenticate, requireSuperAdmin, usuarioController.findById);

// Alta, edicion y baja siguen en `requireAdminOrAbove`, no en `requireSuperAdmin`

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
