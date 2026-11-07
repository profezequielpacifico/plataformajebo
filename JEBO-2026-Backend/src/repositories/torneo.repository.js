const knex = require('../config/knex');
const { crud } = require('./crud');
const alcance = require('../services/alcance.service');

function baseQuery() {
  return knex('torneo as t')
    .select(
      't.*',
      'd.nombre as disciplina_nombre',
      'd.tipo_competencia',
      knex.raw('(SELECT COUNT(*) FROM partido WHERE id_torneo = t.id_torneo) as cantidad_partidos'),
      knex.raw('(SELECT COUNT(*) FROM posicion WHERE id_torneo = t.id_torneo) as cantidad_equipos')
    )
    .join('disciplina as d', 't.id_disciplina', 'd.id_disciplina');
}

module.exports = {
  findAll: ({ page = 1, limit = 10, id_disciplina, estado, scope, alcance: alc } = {}) => {
    const query = baseQuery();

    alcance.filtrarPorTorneosConEquipo(query, alc, 't.id_torneo');

    if (id_disciplina) query.where('t.id_disciplina', id_disciplina);
    if (scope === 'active') {
      query.whereIn('t.estado', ['Programado', 'En Progreso']);
    } else if (scope === 'archived') {
      query.whereIn('t.estado', ['Finalizado', 'Cancelado']);
    } else if (scope === 'inscripciones_abiertas') {
      query.whereRaw('NOW() BETWEEN t.fecha_inscripcion_inicio AND t.fecha_inscripcion_fin');
    } else if (estado) {
      if (Array.isArray(estado)) {
        query.whereIn('t.estado', estado);
      } else {
        query.where('t.estado', estado);
      }
    }
    if (scope !== 'inscripciones_abiertas' && id_disciplina) {
    }
    query.orderBy('t.creado_en', 'desc');
    return knex.paginate(query, { page, limit });
  },
  findById: (id, { alcance: alc } = {}) =>
    alcance
      .filtrarPorTorneosConEquipo(baseQuery(), alc, 't.id_torneo')
      .where('t.id_torneo', id)
      .first(),
  ...crud('torneo', 'id_torneo', ['creado_en', 'actualizado_en']),

  findQualified: (id, limit = 4, { alcance: alc } = {}) => {
    const query = knex('posicion as p')
      .select('p.*', 'e.nombre as equipo_nombre', 'e.colores', 'i.nombre as institucion_nombre')
      .join('equipo as e', 'p.id_equipo', 'e.id_equipo')
      .join('institucion as i', 'e.id_institucion', 'i.id_institucion')
      .where('p.id_torneo', id);
    alcance.filtrarPorTorneosConEquipo(query, alc, 'p.id_torneo');
    return query
      .orderBy([
        { column: 'p.puntos', order: 'desc' },
        { column: knex.raw('(p.gf - p.gc)'), order: 'desc' },
        { column: 'p.gf', order: 'desc' }
      ])
      .limit(limit);
  },
  findFinal: (id, { alcance: alc } = {}) => {
    const query = knex('partido as p')
      .select(
        'p.*',
        'el.nombre as equipo_local_nombre',
        'ev.nombre as equipo_visitante_nombre'
      )
      .join('equipo as el', 'p.id_equipo_local', 'el.id_equipo')
      .join('equipo as ev', 'p.id_equipo_visitante', 'ev.id_equipo')
      .where('p.id_torneo', id);
    alcance.filtrarPorTorneosConEquipo(query, alc, 'p.id_torneo');
    return query
      .orderBy('p.creado_en', 'desc')
      .limit(2)
      .then((rows) => ({ partidos: rows }));
  }
};
