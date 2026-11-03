const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');

/**
 * Búsqueda global, acotada al alcance del solicitante (X-05).
 *
 * `/search/global` era el último readout grande sin filtro: con un token de
 * `Profesor` devolvía nombres de equipos con el nombre de SU institución, y de
 * torneos, canchas e instituciones de todo el sistema. No era un aggregate
 * anónimo: `equipos` selectea `i.nombre as institucion`, así que el search bar
 * de la app enumeraba las instituciones ajenas institution por institution.
 *
 * Se filtra por el mismo criterio que los listados, y con los mismos helpers,
 * para que no haya dos reglas de alcance que puedan divergir:
 *
 *   - `equipo` e `institucion` por `id_institucion` directo.
 *   - `torneo` por inscripción: es interinstitucional y no tiene institución
 *     propia, así que se ve si alguno de los equipos del usuario juega.
 *   - `cancha` NO se filtra. Son las canchas del complejo, no de una
 *     institución: no tienen `id_institucion`. Es el mismo criterio con el que
 *     ya se las deja visibles en los listados.
 *
 * Un search sin resultados devuelve el objeto con las cuatro listas vacías, no
 * un 404. La UI lo trata como "no encontré nada", que es lo que corresponde.
 */
module.exports = {
  global: async (q, alc) => {
    if (!q || q.length < 2) {
      return { torneos: [], equipos: [], canchas: [], instituciones: [] };
    }

    // Se valida acá y no se confía en el `alcance` del controller: es el mismo
    // contrato fail-loud de `filtrarPorInstitucion`. Si un endpoint futuro
    // llama a esta función sin resolver el alcance, corta acá con un error
    // visible en el log en vez de devolver el padrón completo al primer
    // usuario que llegue.
    if (!alc || typeof alc.global !== 'boolean') {
      throw new Error(
        'BusquedaRepository.global requiere un alcance resuelto (X-05). ' +
        'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
      );
    }

    const term = `%${q}%`;

    const [torneos, equipos, canchas, instituciones] = await Promise.all([
      alcanceService
        .filtrarPorTorneosConEquipo(
          knex('torneo').select('id_torneo', 'nombre', 'estado').where('nombre', 'ilike', term),
          alc,
          'torneo.id_torneo'
        )
        .limit(10),
      alcanceService
        .filtrarPorInstitucion(
          knex('equipo as e')
            .select('e.id_equipo', 'e.nombre', 'i.nombre as institucion')
            .join('institucion as i', 'e.id_institucion', 'i.id_institucion')
            .where('e.nombre', 'ilike', term),
          alc,
          'e.id_institucion'
        )
        .limit(10),
      knex('cancha').select('id_cancha', 'nombre').where('nombre', 'ilike', term).limit(10),
      alcanceService
        .filtrarPorInstitucion(
          knex('institucion').select('id_institucion', 'nombre').where('nombre', 'ilike', term),
          alc,
          'institucion.id_institucion'
        )
        .limit(10)
    ]);

    return { torneos, equipos, canchas, instituciones };
  }
};
