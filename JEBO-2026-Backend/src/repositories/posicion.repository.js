const knex = require('../config/knex');
const alcanceService = require('../services/alcance.service');

module.exports = {
  findByTorneo: (id_torneo, { alcance } = {}) => {
    const query = knex('posicion as p')
      .select('p.*', 'e.nombre as equipo_nombre', 'e.colores', 'i.nombre as institucion_nombre')
      .join('equipo as e', 'p.id_equipo', 'e.id_equipo')
      .join('institucion as i', 'e.id_institucion', 'i.id_institucion')
      .where('p.id_torneo', id_torneo)
      .orderBy([
        { column: 'p.puntos', order: 'desc' },
        { column: knex.raw('(p.gf - p.gc)'), order: 'desc' },
        { column: 'p.gf', order: 'desc' }
      ]);

    // La tabla de posiciones (X-05). Era el mismo cruce de tenant que el resto

    alcanceService.filtrarPorEquipos(query, alcance, ['p.id_equipo']);

    return query;
  },
  recalcular: (id_torneo, id_etapa) => knex.raw('SELECT actualizar_posiciones(?, ?)', [id_torneo, id_etapa])
};
