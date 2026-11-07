const {
  PresentacionRepository,
  StaffPartidoRepository,
  StaffPresentacionRepository
} = require('../repositories');
const knex = require('../config/knex');
const { ForbiddenError, NotFoundError, BusinessError } = require('../utils/errors');
const { ROLES, ESTADOS_PRESENTACION } = require('../constants');

const ROLES_ADMIN = [ROLES.SUPERADMIN, ROLES.ADMIN];

const ROLES_JURADO = ['JUEZ_PRESIDENTE', 'JUEZ'];

const esAdministrador = (rol) => ROLES_ADMIN.includes(rol);

const exigirAutenticado = (user) => {
  if (!user) throw new ForbiddenError('No autenticado');
  return user;
};

const esJuezDelJurado = async (idPresentacion, idUsuario) => {
  const staff = await StaffPresentacionRepository.findById(idPresentacion, idUsuario);
  return !!staff && ROLES_JURADO.includes(staff.rol);
};

const assertOperarPartido = async (user, idPartido) => {
  exigirAutenticado(user);
  if (esAdministrador(user.rol)) return true;

  if (user.rol !== ROLES.ARBITRO) {
    throw new ForbiddenError('Rol insuficiente para esta operación');
  }

  const staff = await StaffPartidoRepository.findByPartido(idPartido);
  if (!staff.some((s) => String(s.id_usuario) === String(user.id))) {
    throw new ForbiddenError('No estás asignado a este partido como árbitro');
  }
  return true;
};

const assertEvaluarPresentacion = async (user, idPresentacion, { exigirEnCurso = false } = {}) => {
  exigirAutenticado(user);

  if (exigirEnCurso) {
    const presentacion = await PresentacionRepository.findById(idPresentacion);
    if (!presentacion) throw new NotFoundError('Presentación no encontrada');
    if (presentacion.estado !== ESTADOS_PRESENTACION.EN_CURSO) {
      throw new BusinessError('Solo se puede evaluar una presentación EN_CURSO');
    }
  }

  if (esAdministrador(user.rol)) return true;

  if (user.rol !== ROLES.JUEZ || !(await esJuezDelJurado(idPresentacion, user.id))) {
    throw new ForbiddenError('No eres juez de esta presentación');
  }
  return true;
};

const assertGestionarEquipoPropio = async (user, idEquipo) => {
  exigirAutenticado(user);
  if (esAdministrador(user.rol)) return true;

  if (user.rol !== ROLES.PROFESOR) {
    throw new ForbiddenError('No podés administrar este equipo');
  }

  const equipo = await knex('equipo').where('id_equipo', idEquipo).first();
  if (!equipo) throw new NotFoundError('Equipo no encontrado');
  if (String(equipo.id_usuario) !== String(user.id)) {
    throw new ForbiddenError('No sos el profesor a cargo de este equipo');
  }
  return true;
};

const assertGestionarEquiposPropiosBatch = async (user, idsEquipos) => {
  exigirAutenticado(user);
  if (esAdministrador(user.rol)) return true;

  if (user.rol !== ROLES.PROFESOR) {
    throw new ForbiddenError('No podés administrar estos equipos');
  }

  if (!Array.isArray(idsEquipos) || idsEquipos.length === 0) {
    throw new BusinessError('El lote de inscripciones está vacío');
  }

  const filas = await knex('equipo')
    .whereIn('id_equipo', idsEquipos)
    .select('id_equipo', 'id_usuario');

  const existentes = new Set(filas.map((f) => String(f.id_equipo)));
  const inexistentes = idsEquipos.filter((id) => !existentes.has(String(id)));
  if (inexistentes.length > 0) {
    throw new NotFoundError(`Equipo no encontrado: ${inexistentes.join(', ')}`);
  }

  const ajenos = filas.filter((f) => String(f.id_usuario) !== String(user.id));
  if (ajenos.length > 0) {
    throw new ForbiddenError('No podés inscribir equipos que no son tuyos');
  }

  return true;
};

module.exports = {
  ROLES_ADMIN,
  ROLES_JURADO,
  esAdministrador,
  esJuezDelJurado,
  assertOperarPartido,
  assertEvaluarPresentacion,
  assertGestionarEquipoPropio,
  assertGestionarEquiposPropiosBatch
};
