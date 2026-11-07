const knex = require('../config/knex');

module.exports = {
  findAll: () => knex('etapa_participante').select('*').orderBy('id_etapa_participante'),
  findById: (id) => knex('etapa_participante').where({ id_etapa_participante: id }).first(),
  findByEtapa: (id_competencia_etapa) =>
    knex('etapa_participante').where({ id_competencia_etapa }).orderBy('orden_insercion'),
  findByEquipo: (equipo_id) =>
    knex('etapa_participante').where({ equipo_id }).orderBy('id_etapa_participante'),
  create: (data) => knex('etapa_participante').insert(data).returning('*'),
  update: (id, data) => knex('etapa_participante').where({ id_etapa_participante: id }).update(data).returning('*'),
  delete: (id) => knex('etapa_participante').where({ id_etapa_participante: id }).del().returning('*'),

  createConTrx: (data, trx = knex) => trx('etapa_participante').insert(data).returning('*'),
  updateConTrx: (id, data, trx = knex) => trx('etapa_participante').where({ id_etapa_participante: id }).update(data).returning('*'),
  deleteConTrx: (id, trx = knex) => trx('etapa_participante').where({ id_etapa_participante: id }).del(),
  findByEtapaConTrx: (id_competencia_etapa, trx = knex) =>
    trx('etapa_participante').where({ id_competencia_etapa }).orderBy('orden_insercion')
};
