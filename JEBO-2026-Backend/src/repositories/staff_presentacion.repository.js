const knex = require('../config/knex');

const TABLE = 'staff_presentacion';

module.exports = {
  findByPresentacion: (id_presentacion) =>
    knex
      .select('sp.*', 'u.nombre', 'u.email', 'u.documento')
      .from(`${TABLE} as sp`)
      .join('usuario as u', 'sp.id_usuario', 'u.id_usuario')
      .where('sp.id_presentacion', id_presentacion)
      .orderBy('sp.rol'),

  findJueces: (id_presentacion) =>
    knex
      .select('sp.id_usuario', 'u.nombre')
      .from(`${TABLE} as sp`)
      .join('usuario as u', 'sp.id_usuario', 'u.id_usuario')
      .where('sp.id_presentacion', id_presentacion)
      .whereIn('sp.rol', ['JUEZ_PRESIDENTE', 'JUEZ'])
      .orderBy('sp.rol'),

  findById: (id_presentacion, id_usuario) =>
    knex(TABLE).where({ id_presentacion, id_usuario }).first(),

  create: (data) => knex(TABLE).insert(data).returning('*').then(r => r[0]),

  bulkCreate: (staff, trx) => (trx || knex)(TABLE).insert(staff).returning('*'),

  update: (id_presentacion, id_usuario, data) =>
    knex(TABLE).where({ id_presentacion, id_usuario }).update(data).returning('*').then(r => r[0]),

  delete: (id_presentacion, id_usuario) =>
    knex(TABLE).where({ id_presentacion, id_usuario }).del(),

  deleteByPresentacion: (id_presentacion) =>
    knex(TABLE).where('id_presentacion', id_presentacion).del(),

  validarJueces: async (id_presentacion) => {
    const jueces = await knex(TABLE)
      .where('id_presentacion', id_presentacion)
      .whereIn('rol', ['JUEZ_PRESIDENTE', 'JUEZ'])
      .count('* as total');
    return parseInt(jueces[0].total, 10) === 3;
  }
};