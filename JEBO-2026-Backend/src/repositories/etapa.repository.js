const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: (id_torneo) => {
    const query = knex('etapa as e')
      .select('e.*', 't.nombre as torneo_nombre')
      .join('torneo as t', 'e.id_torneo', 't.id_torneo')
      .orderBy('e.orden');
    if (id_torneo) query.where('e.id_torneo', id_torneo);
    return query;
  },
  findById: (id) => knex('etapa as e')
    .select('e.*', 't.nombre as torneo_nombre')
    .join('torneo as t', 'e.id_torneo', 't.id_torneo')
    .where('e.id_etapa', id).first(),
  createMany: (items) => knex('etapa').insert(items).returning('*'),
  ...crud('etapa', 'id_etapa'),
  deleteByTorneo: (id_torneo) => knex('etapa').where('id_torneo', id_torneo).del(),

  // Métodos que soportan transacciones para syncForTorneo
  findByIdConTorneo: (id_etapa, id_torneo, trx = knex) =>
    trx('etapa').where({ id_etapa, id_torneo }).first(),

  findPorTorneoConBloqueo: (id_torneo, trx = knex) =>
    trx('etapa').where({ id_torneo }).orderBy('orden').forUpdate(),

  updateConTrx: (id_etapa, data, trx = knex) =>
    trx('etapa').where({ id_etapa }).update(data).returning('*'),

  createManyConTrx: (items, trx = knex) =>
    trx('etapa').insert(items).returning('*'),

  deleteConTrx: (id_etapa, trx = knex) =>
    trx('etapa').where({ id_etapa }).del(),

  countPartidos: (id_etapa, trx = knex) =>
    trx('partido').where({ id_etapa }).count('* as count').first(),

  countPosiciones: (id_etapa, trx = knex) =>
    trx('posicion').where({ id_etapa }).count('* as count').first(),

  countPresentaciones: (id_etapa, trx = knex) =>
    trx('presentacion').where({ id_etapa }).count('* as count').first()
};
