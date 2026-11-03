const knex = require('../config/knex');

module.exports = {
  findAll: () => knex('rol').orderBy('id_rol'),
  findById: (id) => knex('rol').where('id_rol', id).first(),
  findByDescripcion: (descripcion) => knex('rol').where('descripcion', descripcion).first(),
  create: (descripcion) => knex('rol').insert({ descripcion }).returning('*').then(r => r[0])
};
