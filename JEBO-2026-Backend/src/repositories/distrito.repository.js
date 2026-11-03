const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => {
    const query = knex('distrito as d')
      .select('d.*')
      .orderBy('d.nombre');
    return query;
  },
  findById: (id) => knex('distrito as d')
    .select('d.*')
    .where('d.id_distrito', id).first(),
  ...crud('distrito', 'id_distrito')
};
