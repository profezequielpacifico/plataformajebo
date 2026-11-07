exports.up = async function (knex) {
  const hasFk = await knex.schema.hasColumn('distrito', 'id_zona');
  if (hasFk) {
    await knex.schema.alterTable('distrito', (table) => {
      table.dropForeign('id_zona');
      table.dropColumn('id_zona');
    });
  }

  await knex.schema.dropTableIfExists('zona');
};

exports.down = async function (knex) {
  await knex.schema.createTable('zona', (table) => {
    table.increments('id_zona').primary();
    table.integer('id_region').unsigned().notNullable().references('id_region').inTable('region');
    table.string('nombre', 150).notNullable();
    table.text('descripcion');
  });

  await knex.schema.alterTable('distrito', (table) => {
    table.integer('id_zona').unsigned().nullable().references('id_zona').inTable('zona');
  });
};
