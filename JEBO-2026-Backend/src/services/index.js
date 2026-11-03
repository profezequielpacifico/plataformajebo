const authService = require('./auth.service');
const usuarioService = require('./usuario.service');
const disciplinaService = require('./disciplina.service');
const canchaService = require('./cancha.service');
const regionService = require('./region.service');
const distritoService = require('./distrito.service');
const institucionService = require('./institucion.service');
const torneoService = require('./torneo.service');
const equipoService = require('./equipo.service');
const partidoService = require('./partido.service');
const disponibilidadService = require('./disponibilidad.service');

module.exports = {
  authService,
  usuarioService,
  disciplinaService,
  canchaService,
  regionService,
  distritoService,
  institucionService,
  torneoService,
  equipoService,
  partidoService,
  disponibilidadService
};
