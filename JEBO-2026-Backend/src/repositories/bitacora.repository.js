const knex = require('../config/knex');

module.exports = {
  findAll: ({ page = 1, limit = 10 } = {}) => {
    const query = knex('bitacora as b')
      .select('b.*', 'u.nombre as usuario_nombre', 'u.email')
      .leftJoin('usuario as u', 'b.id_usuario', 'u.id_usuario')
      .orderBy('b.fecha_hora', 'desc');
    return knex.paginate(query, { page, limit });
  },
  create: (data) => knex('bitacora').insert(data).returning('*').then(r => r[0])
};
