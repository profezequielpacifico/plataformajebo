const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => knex('disciplina').orderBy('nombre'),
  findById: (id) => knex('disciplina').where('id_disciplina', id).first(),
  findByName: (nombre) => knex('disciplina').where('nombre', nombre).first(),
  ...crud('disciplina', 'id_disciplina')
};
