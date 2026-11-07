const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');

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
      knex('usuario').where('estado', 'Activo').count('* as count').first()
    ]);

    return {
      total_torneos: parseInt(torneos.count, 10),
      total_equipos: parseInt(equipos.count, 10),
      total_partidos: parseInt(partidos.count, 10),
      total_usuarios_activos: parseInt(usuarios.count, 10)
    };
  },

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
