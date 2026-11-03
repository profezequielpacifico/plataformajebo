const knex = require('../config/knex');

const TABLE = 'presentacion';

function baseQuery() {
  return knex(TABLE)
    .select(
      'p.*',
      'd.nombre as disciplina_nombre',
      'd.tipo_competencia',
      // Sin `torneo_nombre` el encabezado de la pantalla de puntuacion caia al
      // id numérico del torneo, porque `GymScoringPage` lo muestra y no hay otro
      // lugar del payload de donde sacarlo.
      't.nombre as torneo_nombre',
      'dc.id_cancha',
      'c.nombre as cancha_nombre',
      'c.link_maps',
      'c.ubicacion as cancha_ubicacion',
      'fc.fecha',
      'hc.hora_inicio',
      'hc.hora_fin',
      // "Participantes" del listado: sin esto se leia siempre 0 porque el
      // nombre que pide la pagina no venia de ninguna consulta.
      knex.raw(
        '(SELECT count(*)::int FROM presentacion_participante pp WHERE pp.id_presentacion = p.id_presentacion) as participantes_count'
      ),
      // Columnas de la pantalla que muestra quién se presenta.
      knex.raw(`(
        SELECT e.nombre
          FROM presentacion_participante pp
          JOIN equipo e ON e.id_equipo = pp.id_equipo
         WHERE pp.id_presentacion = p.id_presentacion
         LIMIT 1
      ) as equipo_nombre`),
      knex.raw(`(
        SELECT i.nombre
          FROM presentacion_participante pp
          JOIN equipo e ON e.id_equipo = pp.id_equipo
          LEFT JOIN institucion i ON i.id_institucion = e.id_institucion
         WHERE pp.id_presentacion = p.id_presentacion
         LIMIT 1
      ) as institucion_nombre`)
    )
    .from(`${TABLE} as p`)
    .leftJoin('disciplina as d', 'p.id_disciplina', 'd.id_disciplina')
    .leftJoin('torneo as t', 'p.id_torneo', 't.id_torneo')
    .leftJoin('disponibilidad_cancha as dc', 'p.id_disponibilidad', 'dc.id_disponibilidad')
    .leftJoin('fecha_horario as fh', 'dc.fecha_horario', 'fh.fecha_horario')
    .leftJoin('fecha_cancha as fc', 'fh.id_fecha_cancha', 'fc.id_fecha_cancha')
    .leftJoin('horarios_cancha as hc', 'fh.id_horario_cancha', 'hc.id_horario_cancha')
    .leftJoin('cancha as c', 'dc.id_cancha', 'c.id_cancha');
}

module.exports = {
  findAll: (params = {}) => {
    let q = baseQuery();
    if (params.id_torneo) q = q.where('p.id_torneo', params.id_torneo);
    if (params.estado) q = q.where('p.estado', params.estado);
    if (params.id_disciplina) q = q.where('p.id_disciplina', params.id_disciplina);
    // El filtro de `orden` no era opcional: `create` lo usa para rechazar el
    // orden repetido dentro de un torneo, y sin esto `findAll` devolvía todas las
    // presentaciones del torneo, el `.length > 0` siempre era verdadero y
    // ninguna presentación se podía crear desde la aplicación.
    if (params.orden) q = q.where('p.orden', params.orden);
    if (params.fecha_desde) q = q.where('fc.fecha', '>=', params.fecha_desde);
    if (params.fecha_hasta) q = q.where('fc.fecha', '<=', params.fecha_hasta);
    // Los encuentros donde este usuario esta en el jurado. Lo usa el listado de un

    if (params.id_jurado) {
      q = q.whereIn('p.id_presentacion', knex('staff_presentacion')
        .select('id_presentacion')
        .where('id_usuario', params.id_jurado)
        .whereIn('rol', ['JUEZ_PRESIDENTE', 'JUEZ']));
    }
    q = q.orderBy('p.orden');
    return q;
  },

  findById: (id) =>
    baseQuery()
      .where('p.id_presentacion', id)
      .first(),

  create: (data, trx) => (trx || knex)(TABLE).insert(data).returning('*').then(r => r[0]),

  update: (id, data) => knex(TABLE).where('id_presentacion', id).update(data).returning('*').then(r => r[0]),

  delete: (id) => knex(TABLE).where('id_presentacion', id).del(),

  // Cambiar estado con validación de transiciones
  updateEstado: (id, estado) => {
    const validTransitions = {
      PROGRAMADA: ['EN_CURSO', 'CANCELADA'],
      EN_CURSO: ['FINALIZADA', 'CANCELADA'],
      FINALIZADA: [],
      CANCELADA: ['PROGRAMADA']
    };
    return knex(TABLE)
      .where('id_presentacion', id)
      .whereIn('estado', Object.keys(validTransitions))
      .update({ estado, actualizado_en: knex.fn.now() })
      .returning('*')
      .then(r => r[0]);
  }
};