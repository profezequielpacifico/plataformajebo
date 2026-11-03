const bitacoraRepository = require('./bitacora.repository');
const disponibilidadRepository = require('./disponibilidad.repository');
const busquedaRepository = require('./busqueda.repository');
const canchaRepository = require('./cancha.repository');
const canchaHorarioRepository = require('./cancha_horario.repository');
const competenciaRepository = require('./competencia.repository');
const competenciaEtapaRepository = require('./competencia_etapa.repository');
const configuracionPuntajeRepository = require('./configuracion_puntaje.repository');
const disciplinaRepository = require('./disciplina.repository');
const distritoRepository = require('./distrito.repository');
const equipoRepository = require('./equipo.repository');
const equipoIntegranteRepository = require('./equipo_integrante.repository');
const estadisticaRepository = require('./estadistica.repository');
const etapaRepository = require('./etapa.repository');
const etapaReglaRepository = require('./etapa_regla.repository');
const etapaRestriccionRepository = require('./etapa_restriccion.repository');
const etapaParticipanteRepository = require('./etapa_participante.repository');
const evaluacionRepository = require('./evaluacion.repository');
const eventoRepository = require('./evento.repository');
const instanciaRepository = require('./instancia.repository');
const institucionRepository = require('./institucion.repository');
const localidadRepository = require('./localidad.repository');
const partidoRepository = require('./partido.repository');
const posicionRepository = require('./posicion.repository');
const presentacionRepository = require('./presentacion.repository');
const presentacionParticipanteRepository = require('./presentacion_participante.repository');
const relojRepository = require('./reloj.repository');
const regionRepository = require('./region.repository');
const reglamentoRepository = require('./reglamento.repository');
const rolRepository = require('./rol.repository');
const staffPartidoRepository = require('./staff.repository');
const staffPresentacionRepository = require('./staff_presentacion.repository');
const torneoRepository = require('./torneo.repository');
const usuarioRepository = require('./usuario.repository');

module.exports = {
  BitacoraRepository: bitacoraRepository,
  DisponibilidadRepository: disponibilidadRepository,
  BusquedaRepository: busquedaRepository,
  CanchaRepository: canchaRepository,
  CanchaHorarioRepository: canchaHorarioRepository,
  CompetenciaRepository: competenciaRepository,
  CompetenciaEtapaRepository: competenciaEtapaRepository,
  ConfiguracionPuntajeRepository: configuracionPuntajeRepository,
  DisciplinaRepository: disciplinaRepository,
  DistritoRepository: distritoRepository,
  EquipoRepository: equipoRepository,
  EquipoIntegranteRepository: equipoIntegranteRepository,
  EstadisticaRepository: estadisticaRepository,
  EtapaRepository: etapaRepository,
  EtapaReglaRepository: etapaReglaRepository,
  EtapaRestriccionRepository: etapaRestriccionRepository,
  EtapaParticipanteRepository: etapaParticipanteRepository,
  EvaluacionRepository: evaluacionRepository,
  EventoRepository: eventoRepository,
  InstitucionRepository: institucionRepository,
  InstanciaRepository: instanciaRepository,
  LocalidadRepository: localidadRepository,
  PartidoRepository: partidoRepository,
  PosicionRepository: posicionRepository,
  PresentacionRepository: presentacionRepository,
  PresentacionParticipanteRepository: presentacionParticipanteRepository,
  RelojRepository: relojRepository,
  RegionRepository: regionRepository,
  ReglamentoRepository: reglamentoRepository,
  RolRepository: rolRepository,
  StaffPartidoRepository: staffPartidoRepository,
  StaffPresentacionRepository: staffPresentacionRepository,
  TorneoRepository: torneoRepository,
  UsuarioRepository: usuarioRepository
};
