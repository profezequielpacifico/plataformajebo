const knex = require('../config/knex');

const TABLE = 'evaluacion';

module.exports = {
  findByPresentacion: (id_presentacion) =>
    knex
      .select(
        'e.*',
        'u.nombre as juez_nombre',
        'pp.id_equipo',
        'eq.nombre as equipo_nombre'
      )
      .from(`${TABLE} as e`)
      .join('usuario as u', 'e.id_juez', 'u.id_usuario')
      .join('presentacion_participante as pp', function() {
        this.on('e.id_presentacion', '=', 'pp.id_presentacion')
            .on('e.id_participante_equipo', '=', 'pp.id_equipo');
      })
      .join('equipo as eq', 'pp.id_equipo', 'eq.id_equipo')
      .where('e.id_presentacion', id_presentacion)
      .orderBy(['e.id_participante_equipo', 'e.id_juez']),

  findByPresentacionParticipanteJuez: (id_presentacion, id_participante_equipo, id_juez) =>
    knex(TABLE)
      .where({ id_presentacion, id_participante_equipo, id_juez })
      .first(),

  findByJuez: (id_juez, id_presentacion) =>
    knex(TABLE)
      .where({ id_juez, id_presentacion })
      .orderBy('id_participante_equipo'),

  create: (data) => knex(TABLE).insert(data).returning('*').then(r => r[0]),

  upsert: (data) =>
    knex(TABLE)
      .insert(data)
      .onConflict(['id_presentacion', 'id_participante_equipo', 'id_juez'])
      .merge([
        'coord_1', 'desem_1', 'coord_2', 'desem_2',
        'coord_3', 'desem_3', 'coord_4', 'desem_4',
        'observaciones', 'actualizado_en'
      ])
      .returning('*')
      .then(r => r[0]),

  delete: (id_evaluacion) => knex(TABLE).where('id_evaluacion', id_evaluacion).del(),

  // Calcula totales por juez para una presentación
  totalesPorJuez: (id_presentacion) =>
    knex.raw(`
      SELECT
        e.id_participante_equipo,
        e.id_juez,
        u.nombre as juez_nombre,
        (e.coord_1 + e.coord_2 + e.coord_3 + e.coord_4) AS total_coord,
        (e.desem_1 + e.desem_2 + e.desem_3 + e.desem_4) AS total_desem,
        (e.coord_1 + e.coord_2 + e.coord_3 + e.coord_4 +
         e.desem_1 + e.desem_2 + e.desem_3 + e.desem_4) AS total_juez,
        (CASE WHEN e.coord_1 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_2 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_3 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_4 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_1 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_2 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_3 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_4 >= 4 THEN 1 ELSE 0 END) AS muy_bien_count,
        (CASE WHEN e.coord_1 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_2 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_3 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_4 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_1 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_2 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_3 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_4 <= 2 THEN 1 ELSE 0 END) AS regular_count
      FROM evaluacion e
      JOIN usuario u ON u.id_usuario = e.id_juez
      WHERE e.id_presentacion = ?
      ORDER BY e.id_participante_equipo, e.id_juez
    `, [id_presentacion]),

  // Resultado final usando la vista
  resultadoFinal: (id_presentacion) =>
    knex('v_resultado_presentacion')
      .where('id_presentacion', id_presentacion)
      .orderBy('ranking')
};