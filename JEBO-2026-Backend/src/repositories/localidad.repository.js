const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: (id_distrito) => {
    const query = knex('localidad as l')
      .select('l.*', 'd.nombre as distrito_nombre', 'r.nombre as region_nombre')
      .join('distrito as d', 'l.id_distrito', 'd.id_distrito')
      .join('region as r', 'l.id_region', 'r.id_region')
      .orderBy('l.nombre');
    if (id_distrito) query.where('l.id_distrito', id_distrito);
    return query;
  },
  findById: (id) => knex('localidad as l')
    .select('l.*', 'd.nombre as distrito_nombre', 'r.nombre as region_nombre')
    .join('distrito as d', 'l.id_distrito', 'd.id_distrito')
    .join('region as r', 'l.id_region', 'r.id_region')
    .where('l.id_localidad', id).first(),
  ...crud('localidad', 'id_localidad')
};
