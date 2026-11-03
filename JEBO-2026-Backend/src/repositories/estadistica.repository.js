const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');

/**
 * Estadísticas, acotadas al alcance del solicitante (X-05).
 *
 * El dashboard contaba sobre tablas enteras sin filtro: un token de `Profesor`
 * veía `total_equipos` y `total_usuarios_activos` del sistema completo, que son
 * los mismos números que ve el Administrador. No es el mismo problema que una
 * fila ajena, pero es el mismo agujero: un conteo global es una forma de
 * enumerar lo que existe sin devolver el contenido.
 *
 * `total_usuarios_activos` NO se acota a propósito, y vale la pena decir por
 * qué: `usuario` no tiene institución. La pertenencia vive en
 * `usuario_institucion`, que solo se puebla para Profesores, así que "usuarios
 * de mi institución" es una pregunta sin respuesta bien definida y cualquier
 * respuesta sería inventada. Es un número agregacional, sin identificadores, y
 * el nombre completo está en `/auth/me`. Se deja el conteo global.
 *
 * `torneoStats` sí se acota: las estadísticas de un torneo son de un torneo
 * concreto, y ese torneo tiene que ser visible para quien lo pide. Se valida
 * contra el mismo criterio que la lista de torneos —por inscripción— para que
 * un Profesor no pueda leer las estadísticas de un torneo al que su institución
 * no está anotada, aunque adivine el `id_torneo`.
 */
module.exports = {
  dashboard: async (alc) => {
    if (!alc || typeof alc.global !== 'boolean') {
      throw new Error(
        'EstadisticaRepository.dashboard requiere un alcance resuelto (X-05). ' +
        'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
      );
    }

    const [torneos, equipos, partidos, usuarios] = await Promise.all([
      alcanceService
        .filtrarPorTorneosConEquipo(
          knex('torneo').whereIn('estado', ['Programado', 'En Progreso']),
          alc,
          'torneo.id_torneo'
        )
        .count('* as count')
        .first(),
      alcanceService
        .filtrarPorInstitucion(knex('equipo'), alc, 'equipo.id_institucion')
        .count('* as count')
        .first(),
      alcanceService
        .filtrarPorEquipos(knex('partido'), alc, ['partido.id_equipo_local', 'partido.id_equipo_visitante'])
        .count('* as count')
        .first(),
      // Ver la nota del encabezado: sin filtro y a propósito.
      knex('usuario').where('estado', 'Activo').count('* as count').first()
    ]);

    return {
      total_torneos: parseInt(torneos.count, 10),
      total_equipos: parseInt(equipos.count, 10),
      total_partidos: parseInt(partidos.count, 10),
      total_usuarios_activos: parseInt(usuarios.count, 10)
    };
  },

  /**
   * Estadísticas de un torneo, sólo si el torneo es visible para quien pide.
   *
   * Falla con el mismo `NotFoundError` que una búsqueda sin resultados, no con
   * un 403: responder "existe pero no lo podés ver" convierte el endpoint en un
   * oráculo de `id_torneo` válidos. Es el mismo criterio que `GET /teams/:id`
   * para un equipo ajeno.
   */
  torneoStats: async (id, alc) => {
    if (!alc || typeof alc.global !== 'boolean') {
      throw new Error(
        'EstadisticaRepository.torneoStats requiere un alcance resuelto (X-05). ' +
        'Un endpoint de lectura no debe llamar al repositorio sin pasar `req.alcance`.'
      );
    }

    const visible = await alcanceService
      .filtrarPorTorneosConEquipo(
        knex('torneo').select('id_torneo').where('id_torneo', id),
        alc,
        'torneo.id_torneo'
      )
      .first();

    if (!visible) return null;

    return knex('v_estadisticas_torneo').where('id_torneo', id).first();
  }
};
