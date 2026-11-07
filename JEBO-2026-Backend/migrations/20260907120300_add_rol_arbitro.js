exports.up = async function (knex) {
  const exist = await knex('rol').where('descripcion', 'Arbitro').first();
  if (!exist) {
    await knex('rol').insert({ descripcion: 'Arbitro' });
  }
};

exports.down = async function (knex) {
  await knex('rol').where('descripcion', 'Arbitro').del();
};