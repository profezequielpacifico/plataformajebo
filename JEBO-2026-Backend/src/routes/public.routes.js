const { Router } = require('express');
const cors = require('cors');
const { query, param } = require('express-validator');
const { env } = require('../config');
const { publicLimiter, validate } = require('../middleware');
const publicController = require('../controllers/public.controller');
const { ESTADOS_PUBLICOS } = require('../services/public.service');

const METODOS_PERMITIDOS = ['GET', 'HEAD', 'OPTIONS'];
const ESTADOS_VALIDOS = Object.values(ESTADOS_PUBLICOS);

const idOpcional = (campo) => query(campo).optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage(`${campo} inválido`);
const fechaOpcional = (campo) => query(campo).optional({ values: 'falsy' }).isISO8601({ strict: true }).withMessage(`${campo} debe tener formato AAAA-MM-DD`);

const filtrosFixture = [
  idOpcional('id_region'),
  idOpcional('id_disciplina'),
  idOpcional('id_torneo'),
  idOpcional('id_etapa'),
  fechaOpcional('desde'),
  fechaOpcional('hasta'),
  query('estado').optional({ values: 'falsy' }).custom((valor) => {
    const estados = String(valor).split(',').map((e) => e.trim()).filter(Boolean);
    if (!estados.every((e) => ESTADOS_VALIDOS.includes(e))) throw new Error('estado inválido');
    return true;
  }),
  query('limite').optional({ values: 'falsy' }).isInt({ min: 1, max: 500 }).withMessage('limite inválido'),
  validate
];

const router = Router();

router.use(cors({ origin: env.publicCors.origin, credentials: false, methods: METODOS_PERMITIDOS }));

router.use((req, res, next) => {
  if (METODOS_PERMITIDOS.includes(req.method)) return next();
  res.set('Allow', METODOS_PERMITIDOS.join(', '));
  return res.status(405).json({ success: false, message: 'Método no permitido' });
});

router.use(publicLimiter);

router.use((_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=30');
  next();
});

router.get('/regions', publicController.regiones);
router.get('/disciplines', publicController.disciplinas);
router.get('/tournaments', [idOpcional('id_region'), idOpcional('id_disciplina'), validate], publicController.torneos);
router.get('/tournaments/:id/stages', [param('id').isInt({ min: 1 }).withMessage('id inválido'), validate], publicController.etapas);
router.get('/fixture', filtrosFixture, publicController.fixture);
router.get('/summary', filtrosFixture, publicController.resumen);

router.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Recurso no encontrado' });
});

module.exports = router;
