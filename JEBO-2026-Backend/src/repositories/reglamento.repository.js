const knex = require('../config/knex');

module.exports = {
  findAll: () => knex('reglamento as r')
    .select('r.*', 'd.nombre as disciplina_nombre')
    .join('disciplina as d', 'r.id_disciplina', 'd.id_disciplina')
    .orderBy('r.id_reglamento'),
  findById: (id) => knex('reglamento as r')
    .select('r.*', 'd.nombre as disciplina_nombre')
    .join('disciplina as d', 'r.id_disciplina', 'd.id_disciplina')
    .where('r.id_reglamento', id).first(),
  create: (data) => knex('reglamento').insert(data).returning('*').then(r => r[0]),
  update: (id, data) => knex('reglamento').where('id_reglamento', id).update(data).returning('*').then(r => r[0]),
  delete: (id) => knex('reglamento').where('id_reglamento', id).del().returning('id_reglamento').then(r => r[0])
};
