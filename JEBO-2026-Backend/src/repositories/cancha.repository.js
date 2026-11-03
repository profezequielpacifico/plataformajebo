const knex = require('../config/knex');
const { crud } = require('./crud');

module.exports = {
  findAll: () => knex('cancha as c')
    .select('c.*', 'd.nombre as distrito_nombre', 'di.nombre as disciplina_nombre')
    .join('distrito as d', 'c.id_distrito', 'd.id_distrito')
    .leftJoin('disciplina as di', 'c.id_disciplina', 'di.id_disciplina')
    .orderBy('c.nombre'),
  findById: (id) => knex('cancha as c')
    .select('c.*', 'd.nombre as distrito_nombre', 'di.nombre as disciplina_nombre')
    .join('distrito as d', 'c.id_distrito', 'd.id_distrito')
    .leftJoin('disciplina as di', 'c.id_disciplina', 'di.id_disciplina')
    .where('c.id_cancha', id).first(),
  ...crud('cancha', 'id_cancha', ['creado_en', 'actualizado_en'])
};
