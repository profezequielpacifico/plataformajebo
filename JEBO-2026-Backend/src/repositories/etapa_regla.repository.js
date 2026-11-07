const knex = require('../config/knex');

module.exports = {
  findAll: () => knex('etapa_regla').select('*').orderBy('id_etapa_regla'),
  findById: (id) => knex('etapa_regla').where({ id_etapa_regla: id }).first(),
  findByEtapa: (id_competencia_etapa) =>
    knex('etapa_regla').where({ id_competencia_etapa }).orderBy('orden'),
  findActivasByEtapa: (id_competencia_etapa) =>
    knex('etapa_regla').where({ id_competencia_etapa, activa: true }).orderBy('orden'),
  create: (data) => knex('etapa_regla').insert(data).returning('*'),
  update: (id, data) => knex('etapa_regla').where({ id_etapa_regla: id }).update(data).returning('*'),
  delete: (id) => knex('etapa_regla').where({ id_etapa_regla: id }).del().returning('*'),

  createConTrx: (data, trx = knex) => trx('etapa_regla').insert(data).returning('*'),
  updateConTrx: (id, data, trx = knex) => trx('etapa_regla').where({ id_etapa_regla: id }).update(data).returning('*')
};
