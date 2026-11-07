const { Router } = require('express');
const { authenticate, requireSuperAdmin, requireAdminOrAbove } = require('../middleware');
const knex = require('../config/knex');
const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const disciplinaRoutes = require('./disciplina.routes');
const canchaRoutes = require('./cancha.routes');
const regionRoutes = require('./region.routes');
const distritoRoutes = require('./distrito.routes');
const institucionRoutes = require('./institucion.routes');
const localidadRoutes = require('./localidad.routes');
const etapaRoutes = require('./etapa.routes');
const instanciaRoutes = require('./instancia.routes');
const etapaInstanciaRoutes = require('./etapa_instancia.routes');
const configuracionPuntajeRoutes = require('./configuracion_puntaje.routes');
const torneoRoutes = require('./torneo.routes');
const equipoRoutes = require('./equipo.routes');
const partidoRoutes = require('./partido.routes');
const eventoRoutes = require('./evento.routes');
const presentacionRoutes = require('./presentacion.routes');
const competenciaRoutes = require('./competencia.routes');
const estadisticaController = require('../controllers/estadistica.controller');
const bitacoraController = require('../controllers/bitacora.controller');
const busquedaController = require('../controllers/busqueda.controller');
const fixtureController = require('../controllers/fixture.controller');
const inscripcionController = require('../controllers/inscripcion.controller');
const loginLockoutController = require('../controllers/login-lockout.controller');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'JEBO 2026 API funcionando' });
});

router.use('/auth', authRoutes);
router.use('/users', usuarioRoutes);
router.use('/disciplines', disciplinaRoutes);
router.use('/courts', canchaRoutes);
router.use('/regions', regionRoutes);
router.use('/districts', distritoRoutes);
router.use('/institutions', institucionRoutes);
router.use('/localities', localidadRoutes);
router.use('/stages', etapaRoutes);
router.use('/instancias', instanciaRoutes);
router.use('/stage-instances', etapaInstanciaRoutes);
router.use('/scoring-formats', configuracionPuntajeRoutes);
router.use('/tournaments', torneoRoutes);
router.use('/teams', equipoRoutes);

router.use('/matches', partidoRoutes);
router.use('/matches', eventoRoutes);
router.use('/presentaciones', presentacionRoutes);
router.use('/competencias', competenciaRoutes);

router.get('/roles', authenticate, async (_req, res) => {
  const roles = await knex('rol').select('id_rol', 'descripcion as nombre').orderBy('id_rol');
  res.json({ success: true, data: roles });
});

router.get('/statistics/dashboard', authenticate, estadisticaController.dashboard);
router.get('/statistics/tournaments/:id', authenticate, estadisticaController.torneoStats);

router.get('/audit/logs', authenticate, requireSuperAdmin, bitacoraController.findAll);

router.get('/search/global', authenticate, busquedaController.global);

router.get('/fixture/status/:id_torneo', authenticate, fixtureController.getStatus);

router.post('/fixture/generate', authenticate, requireAdminOrAbove, fixtureController.generate);
router.get('/fixture/audit', authenticate, requireAdminOrAbove, fixtureController.audit);

router.post('/inscripcion/cerrar-vencidas', authenticate, requireAdminOrAbove, inscripcionController.cerrarVencidas);

router.get('/admin/login-lockouts', authenticate, requireSuperAdmin, loginLockoutController.listar);
router.delete('/admin/login-lockouts/:ip', authenticate, requireSuperAdmin, loginLockoutController.desbloquear);

module.exports = router;
