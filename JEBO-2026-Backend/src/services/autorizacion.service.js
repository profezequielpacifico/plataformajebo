const {
  PresentacionRepository,
  StaffPartidoRepository,
  StaffPresentacionRepository
} = require('../repositories');
const knex = require('../config/knex');
const { ForbiddenError, NotFoundError, BusinessError } = require('../utils/errors');
const { ROLES, ESTADOS_PRESENTACION } = require('../constants');

/**
 * Autorizacion de RECURSO, en un solo lugar.
 *
 * Los guards de nivel (`requireSuperAdmin`, `requireAdminOrAbove`) solo miran el
 * rol del token. Estos otros permisos no: necesitan ademas la fila, el estado y
 * la asignacion (docs/modelo-roles.md §5), y por eso no se pueden resolver con
 * una comparacion de rol. Viven aca y no en `middleware/` porque los SERVICIOS
 * son los que tienen la fila a mano y no queremos que la regla de "quien puede
 * operar esto" se escriba dos veces: una en la ruta y otra en el servicio. La
 * ruta delega en estas funciones y el servicio las vuelve a llamar como
 * defensa en profundidad (misma funcion, no una copia).
 */

// Roles de administracion de la competencia. SuperAdmin entra por herencia: es

const ROLES_ADMIN = [ROLES.SUPERADMIN, ROLES.ADMIN];

// Roles de `staff_presentacion` que cuentan como miembro del jurado. Un

const ROLES_JURADO = ['JUEZ_PRESIDENTE', 'JUEZ'];

const esAdministrador = (rol) => ROLES_ADMIN.includes(rol);

const exigirAutenticado = (user) => {
  if (!user) throw new ForbiddenError('No autenticado');
  return user;
};

/**
 * Un juez integra el jurado de ESTA presentacion. La pertenencia sale siempre de
 * la base por `(id_presentacion, id_usuario)`, nunca del request: aceptar un
 * `?id_juez=` dejaria que cualquiera pida la hoja de otro (§8.2). Devuelve
 * booleano porque hay consumidores que solo necesitan el dato (el detalle de
 * evaluacion, que unicamente decide si oculta la planilla).
 */
const esJuezDelJurado = async (idPresentacion, idUsuario) => {
  const staff = await StaffPresentacionRepository.findById(idPresentacion, idUsuario);
  return !!staff && ROLES_JURADO.includes(staff.rol);
};

/**
 * Operar el partido: reloj, eventos, estado y resultado.
 *
 * SuperAdmin/Admin siempre. Un Arbitro SOLO si figura en el staff de ESE
 * partido. `userId` y el `id_usuario` del staff se comparan como string porque
 * Postgres devuelve los INTEGER como number y el token puede traer el id como
 * string: un `===` estricto dejaria afuera al arbitro asignado.
 */
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

/**
 * Evaluar una presentacion: leer/guardar la hoja.
 *
 * SuperAdmin/Admin siempre (su hoja es una cuarta hoja, no una del jurado; la
 * vista de resultado la filtra aparte). Un Juez SOLO si integra el jurado de ESA
 * presentacion. `exigirEnCurso` agrega la regla de estado para las escrituras:
 * no se carga puntaje de un encuentro que no empezo, y aplica tambien al admin
 * porque es una regla del torneo, no un privilegio.
 */
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

/**
 * Gestionar un equipo: SuperAdmin/Admin, o el Profesor que lo dio de alta.
 *
 * `equipo.id_usuario` es el usuario que creo el equipo (migracion
 * `20260929140000_usuario_institucion_poblado`), y es el dato de pertenencia que
 * existe hoy. No confundir con el alcance por institucion, que es otra capa:
 * aca se decide si el profesor es DUEÑO de la fila, no de que institucion es.
 */
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

/**
 * El mismo permiso de `assertGestionarEquipoPropio`, pero sobre una COLECCION.
 *
 * `POST /equipos/enroll-batch` no tiene `:id`: el profesor manda varios equipos
 * y hay que decidir sobre todos a la vez. La regla no cambia —"Profesor, solo
 * sus equipos"— pero el permiso depende de la propiedad de los recursos
 * afectados, no de que exista un id en la ruta.
 *
 * Dos decisiones que importan:
 *
 *  1. **Rechaza el lote entero, no lo filtra.** Devolver 200 con los equipos
 *     propios y descartar en silencio los ajenos sería indistinguible de un
 *     bug: el profesor cree que inscribió cinco equipos y hay tres en la base.
 *     Con un 403 sabe qué pasó y puede corregir el lote.
 *  2. **La consulta va antes de la validación de negocio.** Al revés, un
 *     profesor que mandara el id de un equipo ajeno se enteraría primero de si
 *     ese equipo está inscripto en el torneo, o sea de datos que no son suyos.
 */
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
