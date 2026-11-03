const knex = require('../config/knex');
const { ROLES, ROLES_GLOBALES } = require('../constants');

/**
 * Alcance de datos por institución (X-05).
 *
 * El sistema tiene un eje de tenant real: `equipo.id_institucion`. Lo que
 * faltaba era (a) saber a qué instituciones pertenece cada usuario y (b) que las
 * lecturas filtraran por esa pertenencia. Medido antes de esto: un token de
 * `Profesor` veía los equipos de 7 instituciones distintas y abría `/teams/22`,
 * de una ajena, con 200.
 *
 * La pertenencia vive en la base (`usuario_institucion`) y NO viaja en el JWT,
 * aunque el JWT sea un lugar natural para un claim. El motivo es la frescura:
 *
 *   - Con las instituciones dentro del token, un Profesor que crea un equipo en
 *     una institución nueva no la vería hasta volver a loguearse, y el equipo
 *     recién creado le quedaría invisible. Un token vive 1 hora; el dato de
 *     pertenencia cambia con la operación normal de la app.
 *   - Para que el token fuera seguro habría que firmarlo (ya lo está) y además
 *     invalidarlo al cambiar la pertenencia, que es la misma maquinaria de
 *     `token_version` y no aporta nada acá.
 *
 * Lo que SÍ viaja en el token es la distinción que no cambia: si el usuario
 * tiene alcance global o acotado (`alcance`). Un Administrador o un Árbitro no
 * paga ninguna consulta extra; un Profesor paga una lectura por índice sobre una
 * tabla de dos columnas. El costo es despreciable frente a la consulta principal
 * de cualquier listado, y se prefiere la corrección a ahorrar esa lectura.
 *
 * Tres invariantes que sostienen el aislamiento, y que hay que respetar al
 * agregar endpoints:
 *
 *   1. `resolver` es la ÚNICA fuente del alcance. Ninguna función acepta una
 *      institución que venga del cliente (query, body o header): filtrar por un
 *      `id_institucion` que manda el frontend es exactamente el agujero que esto
 *      cierra.
 *   2. Un usuario sin instituciones obtiene `instituciones: []`, y `whereIn`
 *      sobre un array vacío no devuelve filas. Es fail-closed por construcción:
 *      el caso "Profesor recién creado, sin equipos" ve cero, no todo.
 *   3. `alcance` ausente NO significa global. `filtrarPorInstitucion` lanza si no
 *      recibe un alcance resuelto, para que un endpoint nuevo que se olvide de
 *      pasarlo falle ruidosamente en vez de filtrar de menos en silencio.
 */

// Roles con visibilidad global. Un Administrador administra todo el sistema; un
// Árbitro necesita ver los partidos de todas las instituciones para arbitrar, y
// no pertenece a ninguna en particular.
//
// El bypass es una lista de roles y no una bandera en la base a propósito: el
// criterio es de autorización, y agregar un rol global no debería requerir una
// migración de datos. La lista vive en `constants/roles.js` y no se re-declara
// acá: dos copias de la lista de roles globales es una forma garantizada de que
// se divergan sin que nada avise.

const GLOBAL = Object.freeze({ global: true, instituciones: null });

/**
 * Roles que administran usuarios, y por lo tanto pueden ver el padrón completo y
 * enumerarlo sin filtrar por rol.
 *
 * Es un subconjunto de `ROLES_GLOBALES`, y esa diferencia es deliberada. "Global"
 * responde "de qué instituciones tenés que ocuparte": un Árbitro es global porque
 * tiene que arbitrar partidos de todas las instituciones, y no porque administre
 * personas. Si el padrón de usuarios se cerrara con `alcance.global` nomás,
 * cualquier Árbitro —y hay 6 árbitros con cuenta— leería con `GET /users?rol=Arbitro`
 * el email y el documento de todos los árbitros del sistema, incluido los de
 * otras instituciones, sin ninguna necesidad operativa detrás.
 *
 * Lo mismo con el árbol de alcance: un Árbitro con alcance global tampoco puede
 * leer un usuario puntual por id. Esa lectura es la pantalla de edición de
 * SuperAdmin, no un selector.
 *
 * No confundirse: esto NO habilita SuperAdmin ni crea el rol. Solo describe qué
 * roles existentes hoy pueden ver el padrón. Ver `docs/modelo-roles.md` §5.
 */
const ROLES_USUARIOS = Object.freeze([ROLES.SUPERADMIN, ROLES.ADMIN]);

/** Rol efectivo, tolerando los dos nombres que usa el código (`rol` y `role`). */
const rolDe = (usuario) => (usuario && (usuario.rol || usuario.role)) || null;

const esGlobal = (usuario) => ROLES_GLOBALES.includes(rolDe(usuario));

/**
 * `true` si el alcance corresponde a un rol que administra usuarios.
 *
 * `alcance.global` NO alcanza a propósito, porque `global` es un superconjunto. Un
 * alcance sin `rol` (un fixture de test, un alcance armado a mano) da `false`,
 * que es el lado seguro: se cae a la proyección mínima y a exigir filtro de rol.
 */
const puedeAdministrarUsuarios = (alcance) => Boolean(alcance && alcance.rol && ROLES_USUARIOS.includes(alcance.rol));

/** Instituciones a las que pertenece un usuario, según `usuario_institucion`. */
const institucionesDe = async (idUsuario) => {
  if (!idUsuario) return [];
  const filas = await knex('usuario_institucion')
    .where('id_usuario', idUsuario)
    .select('id_institucion');
  // Los ids se normalizan a entero: la columna es `integer`, pero un driver o
  // una migración futura podrían devolverlos como string, y `whereIn` compara
  // con `=` sin coerción en PostgreSQL. Un `'13'` no matchearía contra `13`.
  return filas.map((f) => parseInt(f.id_institucion, 10));
};

/**
 * Resuelve el alcance de un usuario autenticado.
 *
 * Devuelve `GLOBAL` para Administrador/Árbitro sin tocar la base, o
 * `{ global: false, instituciones: [...] }` para el resto.
 */
const resolver = async (usuario) => {
  if (!usuario) {
    // Sin usuario no hay alcance legítimo. Devolver GLOBAL acá sería fail-open
    // justo en el caso que más importa.
    return { global: false, instituciones: [], rol: null };
  }
  const rol = rolDe(usuario);
  // Se devuelve un objeto nuevo en vez del singleton `GLOBAL` porque el alcance
  // ahora carga también el `rol`, y `GLOBAL` es un único objeto congelado y
  // compartido: mutarlo para guardar el rol de cada request haría que todos los
  // usuarios globales compartieran el rol del último que pasó. Los `filtrarPor*`
  // solo leen `global` e `instituciones`, así que agregar el campo no los afecta.
  if (ROLES_GLOBALES.includes(rol)) return { global: true, instituciones: null, rol };
  return {
    global: false,
    instituciones: await institucionesDe(usuario.id_usuario || usuario.id),
    rol
  };
};

/**
 * Aplica el filtro de institución a un query builder de knex.
 *
 * `columna` es la columna de institución del query (con su alias si lo tiene).
 * Lanza si no recibe un alcance resuelto: ver la invariante 3 del encabezado.
 */
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

/**
 * Filtra por las instituciones de los equipos que participan, no por una columna
 * directa. Es para las tablas que no tienen `id_institucion` pero llegan a ella
 * por un equipo: `partido` (dos equipos) y `torneo` (por inscripción).
 *
 * `columnasEquipo` es la lista de columnas que referencian `equipo.id_equipo`
 * (una para `posicion`, dos para `partido`). El filtro es un OR entre ellas: el
 * usuario ve la fila si CUALQUIERA de sus equipos está en su institución.
 */
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
      this.orWhereIn(
        col,
        knex(`${tablaEquipo} as eq_alcance`)
          .select('eq_alcance.id_equipo')
          .whereIn('eq_alcance.id_institucion', alcance.instituciones)
      );
    }
  });
};

/**
 * Filtra un torneo por inscripción: es visible si al menos uno de los equipos
 * anotados pertenece a una institución del usuario.
 *
 * Un torneo no tiene institución propia —es interinstitucional por diseño—, así
 * que no se puede filtrar por columna. La pertenencia se define por
 * participación: si mi institución juega el torneo, lo veo; si no, no.
 *
 * `columnaTorneo` es la columna del query que apunta a `torneo.id_torneo`.
 */
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
  // Subconjunto de los globales: los que además administran usuarios.
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
