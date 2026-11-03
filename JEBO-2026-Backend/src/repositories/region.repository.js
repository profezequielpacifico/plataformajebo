const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => knex('region').orderBy('nombre'),
  findById: (id) => knex('region').where('id_region', id).first(),
  ...crud('region', 'id_region')
};
