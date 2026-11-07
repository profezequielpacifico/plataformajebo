exports.up = async function (knex) {
  await knex('rol').where('descripcion', 'Entrenador').del();
};

exports.down = async function (knex) {
  const exist = await knex('rol').where('descripcion', 'Entrenador').first();
  if (!exist) {
    await knex('rol').insert({ descripcion: 'Entrenador' });
  }
};
