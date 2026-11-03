const { Router } = require('express');
const { body, param, query } = require('express-validator');
const eventoController = require('../controllers/evento.controller');
const { authenticate, operarPartido, validate } = require('../middleware');

const router = Router();

// Reloj del partido. Es un solo endpoint con las tres transiciones porque las

router.post('/:id/clock', authenticate, operarPartido, [
  param('id').isInt().withMessage('Partido inválido'),
  body('accion').isIn(['INICIAR', 'PAUSAR', 'REANUDAR']).withMessage('Acción de reloj inválida')
], validate, eventoController.relojAccion);

router.get('/:id/clock', authenticate, [
  param('id').isInt().withMessage('Partido inválido')
], validate, eventoController.relojEstado);

// Registro de eventos. `id_equipo` se valida como entero aca, pero que

router.post('/:id/events', authenticate, operarPartido, [
  param('id').isInt().withMessage('Partido inválido'),
  body('id_equipo').isInt().withMessage('Equipo es requerido'),
  body('idempotency_key').optional().isString().isLength({ max: 64 })
    .withMessage('Clave de idempotencia inválida')
], validate, eventoController.registrar);

router.get('/:id/events', authenticate, [
  param('id').isInt().withMessage('Partido inválido'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], validate, eventoController.findByPartido);

// Anular, no borrar. El motivo es obligatorio: una anulacion sin explicacion es

router.patch('/:id/events/:idEvento/anular', authenticate, operarPartido, [
  param('id').isInt().withMessage('Partido inválido'),
  param('idEvento').isInt().withMessage('Evento inválido'),
  body('motivo_anulacion').isString().trim().isLength({ min: 1, max: 500 })
    .withMessage('El motivo de anulación es obligatorio')
], validate, eventoController.anular);

module.exports = router;
