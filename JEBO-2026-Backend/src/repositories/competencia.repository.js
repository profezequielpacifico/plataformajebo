const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => knex('competencia').select('*').orderBy('id_competencia'),
  findById: (id) => knex('competencia').where({ id_competencia: id }).first(),
  create: (data) => knex('competencia').insert(data).returning('*'),
  update: (id, data) => knex('competencia').where({ id_competencia: id }).update(data).returning('*'),
  delete: (id) => knex('competencia').where({ id_competencia: id }).del().returning('*'),

  createConTrx: (data, trx = knex) => trx('competencia').insert(data).returning('*'),
  updateConTrx: (id, data, trx = knex) => trx('competencia').where({ id_competencia: id }).update(data).returning('*'),
  findByIdConTrx: (id, trx = knex) => trx('competencia').where({ id_competencia: id }).first()
};
