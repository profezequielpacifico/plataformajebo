const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => knex('competencia_etapa').select('*').orderBy('id_competencia_etapa'),
  findById: (id) => knex('competencia_etapa').where({ id_competencia_etapa: id }).first(),
  findByCompetencia: (id_competencia) =>
    knex('competencia_etapa').where({ id_competencia }).orderBy('orden'),
  create: (data) => knex('competencia_etapa').insert(data).returning('*'),
  update: (id, data) => knex('competencia_etapa').where({ id_competencia_etapa: id }).update(data).returning('*'),
  delete: (id) => knex('competencia_etapa').where({ id_competencia_etapa: id }).del().returning('*'),

  createConTrx: (data, trx = knex) => trx('competencia_etapa').insert(data).returning('*'),
  updateConTrx: (id, data, trx = knex) => trx('competencia_etapa').where({ id_competencia_etapa: id }).update(data).returning('*'),
  findByIdConTrx: (id, trx = knex) => trx('competencia_etapa').where({ id_competencia_etapa: id }).first(),
  findByCompetenciaConTrx: (id_competencia, trx = knex) =>
    trx('competencia_etapa').where({ id_competencia }).orderBy('orden')
};
