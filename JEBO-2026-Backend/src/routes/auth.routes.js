const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { loginLockout, registerLimiter, recoverPasswordLimiter, authLimiter, sessionLimiter, validate, authenticate } = require('../middleware');
const { documentoValidator } = require('../utils');

const router = Router();

router.get('/loginStatus', sessionLimiter, loginLockout.getStatus);

router.post('/login', authLimiter, loginLockout, [
  body('email').trim().toLowerCase().isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password es requerido')
], validate, authController.login);

router.post('/refresh', sessionLimiter, authController.refresh);

router.post('/logout', sessionLimiter, authController.logout);

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
