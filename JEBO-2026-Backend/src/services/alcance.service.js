const knex = require('../config/knex');
const { ROLES, ROLES_GLOBALES } = require('../constants');

const GLOBAL = Object.freeze({ global: true, instituciones: null });

const ROLES_USUARIOS = Object.freeze([ROLES.SUPERADMIN, ROLES.ADMIN]);

const rolDe = (usuario) => (usuario && (usuario.rol || usuario.role)) || null;

const esGlobal = (usuario) => ROLES_GLOBALES.includes(rolDe(usuario));

const puedeAdministrarUsuarios = (alcance) => Boolean(alcance && alcance.rol && ROLES_USUARIOS.includes(alcance.rol));

const institucionesDe = async (idUsuario) => {
  if (!idUsuario) return [];
  const filas = await knex('usuario_institucion')
    .where('id_usuario', idUsuario)
    .select('id_institucion');
  return filas.map((f) => parseInt(f.id_institucion, 10));
};

const resolver = async (usuario) => {
  if (!usuario) {
    return { global: false, instituciones: [], rol: null };
  }
  const rol = rolDe(usuario);
  if (ROLES_GLOBALES.includes(rol)) return { global: true, instituciones: null, rol };
  return {
    global: false,
    instituciones: await institucionesDe(usuario.id_usuario || usuario.id),
    rol
  };
};

const filtrarPorInstitucion = (query, alcance, columna) => {
  if (!alcance || typeof alcance.global !== 'boolean') {
    throw new Error(
      'filtrarPorInstitucion requiere un alcance resuelto (X-05). ' +
      'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
    );
  }
  if (alcance.global) return query;
  return query.whereIn(columna, alcance.instituciones);
};

const filtrarPorEquipos = (query, alcance, columnasEquipo, { tablaEquipo = 'equipo' } = {}) => {
  if (!alcance || typeof alcance.global !== 'boolean') {
    throw new Error(
      'filtrarPorEquipos requiere un alcance resuelto (X-05). ' +
      'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
    );
  }
  if (alcance.global) return query;

  const cols = Array.isArray(columnasEquipo) ? columnasEquipo : [columnasEquipo];
  return query.where(function () {
    for (const col of cols) {
      this.orWhereRaw('?? = ANY(ARRAY(?))', [
        col,
        knex(`${tablaEquipo} as eq_alcance`)
          .select('eq_alcance.id_equipo')
          .whereIn('eq_alcance.id_institucion', alcance.instituciones)
      ]);
    }
  });
};

const filtrarPorTorneosConEquipo = (query, alcance, columnaTorneo) => {
  if (!alcance || typeof alcance.global !== 'boolean') {
    throw new Error(
      'filtrarPorTorneosConEquipo requiere un alcance resuelto (X-05). ' +
      'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
    );
  }
  if (alcance.global) return query;
  return query.where(function () {
    this.whereExists(function () {
      this.select(1)
        .from('posicion as pos_alcance')
        .join('equipo as eq_alcance', 'pos_alcance.id_equipo', 'eq_alcance.id_equipo')
        .whereRaw(`pos_alcance.id_torneo = ${columnaTorneo}`)
        .whereIn('eq_alcance.id_institucion', alcance.instituciones);
    });
  });
};

module.exports = {
  ROLES_GLOBALES,
  ROLES_USUARIOS,
  GLOBAL,
  esGlobal,
  puedeAdministrarUsuarios,
  rolDe,
  institucionesDe,
  resolver,
  filtrarPorInstitucion,
  filtrarPorEquipos,
  filtrarPorTorneosConEquipo
};
