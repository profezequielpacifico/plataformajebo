const knex = require('../config/knex');

const TABLE = 'presentacion_participante';

module.exports = {
  findByPresentacion: (id_presentacion) =>
    knex
      .select(
        'pp.*',
        'e.nombre as equipo_nombre',
        'i.nombre as institucion_nombre'
      )
      .from(`${TABLE} as pp`)
      .join('equipo as e', 'pp.id_equipo', 'e.id_equipo')
      .leftJoin('institucion as i', 'e.id_institucion', 'i.id_institucion')
      .where('pp.id_presentacion', id_presentacion)
      .orderBy('pp.orden_salida'),

  findById: (id_presentacion, id_equipo) =>
    knex(TABLE).where({ id_presentacion, id_equipo }).first(),

  create: (data, trx) => (trx || knex)(TABLE).insert(data).returning('*').then(r => r[0]),

  bulkCreate: (participantes) => knex(TABLE).insert(participantes).returning('*'),

  update: (id_presentacion, id_equipo, data) =>
    knex(TABLE).where({ id_presentacion, id_equipo }).update(data).returning('*').then(r => r[0]),

  delete: (id_presentacion, id_equipo) =>
    knex(TABLE).where({ id_presentacion, id_equipo }).del(),

  deleteByPresentacion: (id_presentacion) =>
    knex(TABLE).where('id_presentacion', id_presentacion).del(),

  // Reordenar salidas
  reordenar: (id_presentacion, orden) => {
    // orden = [{id_equipo, orden_salida}, ...]
    const trx = knex.transaction();
    return Promise.all(
      orden.map(({ id_equipo, orden_salida }) =>
        trx(TABLE).where({ id_presentacion, id_equipo }).update({ orden_salida })
      )
    ).then(() => trx.commit()).catch(e => trx.rollback().then(() => Promise.reject(e)));
  }
};