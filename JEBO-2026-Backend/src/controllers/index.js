const authController = require('./auth.controller');
const usuarioController = require('./usuario.controller');
const disciplinaController = require('./disciplina.controller');
const canchaController = require('./cancha.controller');
const regionController = require('./region.controller');
const distritoController = require('./distrito.controller');
const institucionController = require('./institucion.controller');
const torneoController = require('./torneo.controller');
const equipoController = require('./equipo.controller');
const partidoController = require('./partido.controller');
const posicionController = require('./posicion.controller');
const estadisticaController = require('./estadistica.controller');
const bitacoraController = require('./bitacora.controller');
const busquedaController = require('./busqueda.controller');
const disponibilidadController = require('./disponibilidad.controller');

module.exports = {
  authController,
  usuarioController,
  disciplinaController,
  canchaController,
  regionController,
  distritoController,
  institucionController,
  torneoController,
  equipoController,
  partidoController,
  posicionController,
  estadisticaController,
  bitacoraController,
  busquedaController,
  disponibilidadController
};
