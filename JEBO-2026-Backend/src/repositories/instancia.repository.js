const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: ({ limit, offset, search } = {}) => {
    const query = knex('instancia').select('*').orderBy('id_instancia');
    if (search) query.where('descripcion_instancia', 'ilike', `%${search}%`);
    if (limit) query.limit(limit);
    if (offset) query.offset(offset);
    return query;
  },
  count: ({ search } = {}) => {
    const query = knex('instancia').count('* as total');
    if (search) query.where('descripcion_instancia', 'ilike', `%${search}%`);
    return query.then(r => parseInt(r[0].total, 10));
  },
  findById: (id) => knex('instancia').where('id_instancia', id).first(),
  ...crud('instancia', 'id_instancia')
};
