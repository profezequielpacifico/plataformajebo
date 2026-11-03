const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { loginLockout, registerLimiter, recoverPasswordLimiter, authLimiter, validate, authenticate } = require('../middleware');
const { documentoValidator } = require('../utils');

const router = Router();

router.get('/loginStatus', authLimiter, loginLockout.getStatus);

// El `trim().toLowerCase()` está en la ruta y no solo en el servicio para que el

router.post('/login', authLimiter, loginLockout, [
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password es requerido')
], validate, authController.login);

// El refresh token viene de la cookie `httpOnly`, nunca del body. No hay

router.post('/refresh', authLimiter, authController.refresh);

// El logout NO exige `authenticate`. Es a proposito: el caso para el que existe

router.post('/logout', authLimiter, authController.logout);

router.get('/me', authenticate, authController.me);

router.post('/recover-password', recoverPasswordLimiter, [
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido')
], validate, authController.recoverPassword);

router.post('/register', registerLimiter, [
  body('nombre').notEmpty().withMessage('Nombre es requerido'),
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('documento').custom(documentoValidator),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
], validate, authController.register);

module.exports = router;
