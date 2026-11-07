const knex = require('../config/knex');

const TABLE = 'configuracion_puntaje';

module.exports = {
  findByTorneoDisciplina: (id_torneo, id_disciplina) =>
    knex(TABLE)
      .where({ id_torneo, id_disciplina })
      .first(),

  findByTorneo: (id_torneo) =>
    knex(TABLE)
      .where('id_torneo', id_torneo),

  findById: (id_config) =>
    knex(TABLE).where('id_config', id_config).first(),

  create: (data) => knex(TABLE).insert(data).returning('*').then(r => r[0]),

  upsert: (data, trx) =>
    (trx || knex)(TABLE)
      .insert(data)
      .onConflict(['id_torneo', 'id_disciplina'])
      .merge([
        'peso_dificultad', 'peso_ejecucion', 'peso_artistico', 'peso_sincronizacion',
        'max_dificultad', 'max_ejecucion', 'max_artistico', 'max_sincronizacion',
        'descartar_mejor', 'descartar_peor', 'max_penalizaciones'
      ])
      .returning('*')
      .then(r => r[0]),

  update: (id_config, data) =>
    knex(TABLE).where('id_config', id_config).update(data).returning('*').then(r => r[0]),

  delete: (id_config) => knex(TABLE).where('id_config', id_config).del(),

  defaultGimnasia: () => ({
    peso_dificultad: 1.00,
    peso_ejecucion: 1.00,
    peso_artistico: 1.00,
    peso_sincronizacion: 1.00,
    max_dificultad: 20.00,
    max_ejecucion: 20.00,
    max_artistico: 20.00,
    max_sincronizacion: 20.00,
    descartar_mejor: 0,
    descartar_peor: 0,
    max_penalizaciones: 10.00
  })
};