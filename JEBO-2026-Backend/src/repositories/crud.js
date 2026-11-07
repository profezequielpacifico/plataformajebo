const knex = require('../config/knex');
const { validarColumnas } = require('../utils/columnas');

const crud = (tabla, pk, bloquear) => {
  const config = { pk, bloquear };

  return {
    create: async (data) => {
      await validarColumnas(tabla, data, config);
      return knex(tabla).insert(data).returning('*').then((r) => r[0]);
    },
    update: async (id, data) => {
      await validarColumnas(tabla, data, config);
      return knex(tabla).where(pk, id).update(data).returning('*').then((r) => r[0]);
    },
    delete: (id) => knex(tabla).where(pk, id).del().returning(pk).then((r) => r[0])
  };
};

module.exports = { crud };
