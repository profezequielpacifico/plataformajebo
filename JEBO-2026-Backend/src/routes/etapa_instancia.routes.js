const { Router } = require('express');
const { body, param } = require('express-validator');
const etapaInstanciaController = require('../controllers/etapa_instancia.controller');
const { authenticate, requireAdminOrAbove, validate } = require('../middleware');

const router = Router();

const idValido = (nombre) => param(nombre).isInt({ min: 1 }).withMessage('Identificador inválido');

router.get('/torneo/:torneoId', authenticate, requireAdminOrAbove, [idValido('torneoId')], validate, etapaInstanciaController.listarPorTorneo);
router.post('/etapa/:etapaId/preparar', authenticate, requireAdminOrAbove, [
  idValido('etapaId'),
  body('zonas').optional().isArray({ min: 1, max: 64 }).withMessage('zonas debe ser una lista de 1 a 64 zonas'),
  body('zonas.*.nombre').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Nombre de zona inválido'),
  body('zonas.*.equipos').optional().isArray({ min: 1 }).withMessage('Cada zona necesita una lista de equipos'),
  body('zonas.*.equipos.*').optional().isInt({ min: 1 }).withMessage('Equipo inválido')
], validate, etapaInstanciaController.preparar);
router.get('/:id', authenticate, requireAdminOrAbove, [idValido('id')], validate, etapaInstanciaController.detalle);
router.post('/:id/encuentros', authenticate, requireAdminOrAbove, [idValido('id')], validate, etapaInstanciaController.generarEncuentros);
router.post('/:id/participantes', authenticate, requireAdminOrAbove, [
  idValido('id'),
  body('id_equipo').isInt({ min: 1 }).withMessage('Equipo inválido')
], validate, etapaInstanciaController.agregarParticipante);
router.post('/:id/finalizar', authenticate, requireAdminOrAbove, [
  idValido('id'),
  body('desempate').optional().isArray().withMessage('Desempate inválido'),
  body('desempate.*').optional().isInt({ min: 1 }).withMessage('Desempate inválido')
], validate, etapaInstanciaController.finalizar);

module.exports = router;
