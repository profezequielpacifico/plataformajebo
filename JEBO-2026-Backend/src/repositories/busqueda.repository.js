const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');

module.exports = {
  global: async (q, alc) => {
    if (!q || q.length < 2) {
      return { torneos: [], equipos: [], canchas: [], instituciones: [] };
    }

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
