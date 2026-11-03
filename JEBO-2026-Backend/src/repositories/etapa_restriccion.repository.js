const knex = require('../config/knex');

module.exports = {
  findAll: () => knex('etapa_restriccion').select('*').orderBy('id_etapa_restriccion'),
  findById: (id) => knex('etapa_restriccion').where({ id_etapa_restriccion: id }).first(),
  findByEtapa: (id_competencia_etapa) =>
    knex('etapa_restriccion').where({ id_competencia_etapa }).orderBy('id_etapa_restriccion'),
  findActivasByEtapa: (id_competencia_etapa) =>
    knex('etapa_restriccion').where({ id_competencia_etapa, activo: true }),
  create: (data) => knex('etapa_restriccion').insert(data).returning('*'),
  update: (id, data) => knex('etapa_restriccion').where({ id_etapa_restriccion: id }).update(data).returning('*'),
  delete: (id) => knex('etapa_restriccion').where({ id_etapa_restriccion: id }).del().returning('*'),

  // Métodos con transacción
  createConTrx: (data, trx = knex) => trx('etapa_restriccion').insert(data).returning('*'),
  updateConTrx: (id, data, trx = knex) => trx('etapa_restriccion').where({ id_etapa_restriccion: id }).update(data).returning('*')
};
