const knex = require('../config/knex');
const { crud } = require('./crud');
const alcance = require('../services/alcance.service');

function baseQuery() {
  return knex('equipo as e')
    .select(
      'e.*',
      'd.nombre as disciplina_nombre',
      'i.nombre as institucion_nombre',
      'u.nombre as usuario_nombre',
      'u.nombre as entrenador',
      'i.nombre as institucion',
      'di.nombre as distrito_nombre',
      'di.nombre as distrito',
      'l.id_region',
      'r.nombre as region_nombre',
      knex.raw('(SELECT COUNT(*) FROM equipo_alumno WHERE id_equipo = e.id_equipo) as cantidad_jugadores'),
      knex.raw('(SELECT p2.estado_torneo FROM posicion p2 WHERE p2.id_equipo = e.id_equipo ORDER BY p2.id_torneo DESC LIMIT 1) as estado_torneo'),
      knex.raw('(SELECT t2.nombre FROM torneo t2 JOIN posicion p3 ON p3.id_torneo = t2.id_torneo WHERE p3.id_equipo = e.id_equipo ORDER BY p3.id_torneo DESC LIMIT 1) as torneo_nombre')
    )
    .join('disciplina as d', 'e.id_disciplina', 'd.id_disciplina')
    .join('institucion as i', 'e.id_institucion', 'i.id_institucion')
    .leftJoin('usuario as u', 'e.id_usuario', 'u.id_usuario')
    .leftJoin('localidad as l', 'e.id_localidad', 'l.id_localidad')
    .leftJoin('distrito as di', 'l.id_distrito', 'di.id_distrito')
    .leftJoin('region as r', 'l.id_region', 'r.id_region');
}

module.exports = {
  findAll: ({ page = 1, limit = 10, id_disciplina, id_institucion, search, filter, id_torneo, id_region, id_distrito, id_localidad, alcance: alc } = {}) => {
    const query = baseQuery();

    alcance.filtrarPorInstitucion(query, alc, 'e.id_institucion');

    if (id_disciplina) query.where('e.id_disciplina', id_disciplina);
    if (id_institucion) query.where('e.id_institucion', id_institucion);
    if (id_region) query.where('l.id_region', id_region);
    if (id_distrito) query.where('di.id_distrito', id_distrito);
    if (id_localidad) query.where('e.id_localidad', id_localidad);

    if (id_torneo) {
      query.join('posicion as p', 'e.id_equipo', 'p.id_equipo');
      query.where('p.id_torneo', id_torneo);
    }

    if (search && filter) {
      switch (filter) {
        case 'nombre':
          query.where('e.nombre', 'ilike', `%${search}%`);
          break;
        case 'institucion':
          query.where('i.nombre', 'ilike', `%${search}%`);
          break;
        case 'distrito':
          query.where('di.nombre', 'ilike', `%${search}%`);
          break;
        case 'entrenador':
          query.where('u.nombre', 'ilike', `%${search}%`);
          break;
        case 'torneo':
          query.whereRaw('(SELECT t2.nombre FROM torneo t2 JOIN posicion p2 ON p2.id_torneo = t2.id_torneo WHERE p2.id_equipo = e.id_equipo LIMIT 1) ILIKE ?', [`%${search}%`]);
          break;
        case 'estado_torneo':
          query.whereRaw('(SELECT p2.estado_torneo FROM posicion p2 WHERE p2.id_equipo = e.id_equipo LIMIT 1) ILIKE ?', [`%${search}%`]);
          break;
        default:
          query.where('e.nombre', 'ilike', `%${search}%`);
      }
    } else if (search) {
      query.where(function () {
        this.where('e.nombre', 'ilike', `%${search}%`)
          .orWhere('i.nombre', 'ilike', `%${search}%`)
          .orWhere('u.nombre', 'ilike', `%${search}%`)
          .orWhere('di.nombre', 'ilike', `%${search}%`);
      });
    }

    query.groupBy('e.id_equipo', 'd.nombre', 'i.nombre', 'u.nombre', 'l.id_distrito', 'di.nombre', 'l.id_region', 'r.nombre');
    query.orderBy('e.nombre');

    return knex.paginate(query, { page, limit });
  },

  findById: (id, { alcance: alc } = {}) =>
    alcance
      .filtrarPorInstitucion(baseQuery(), alc, 'e.id_institucion')
      .where('e.id_equipo', id)
      .groupBy('e.id_equipo', 'd.nombre', 'i.nombre', 'u.nombre', 'l.id_distrito', 'di.nombre', 'l.id_region', 'r.nombre')
      .first(),

  countDelDuenio: (idUsuario) =>
    knex('equipo').where('id_usuario', idUsuario).count({ total: '*' }).first(),

  findByDuenioYNombre: (idUsuario, nombre) =>
    knex('equipo')
      .where('id_usuario', idUsuario)
      .whereRaw('lower(nombre) = lower(?)', [nombre])
      .first(),

  ...crud('equipo', 'id_equipo')
};
