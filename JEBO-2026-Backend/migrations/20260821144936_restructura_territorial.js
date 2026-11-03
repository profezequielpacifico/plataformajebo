/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('localidad', (table) => {
    table.increments('id_localidad').primary();
    table.integer('id_distrito').unsigned().notNullable().references('id_distrito').inTable('distrito').onUpdate('CASCADE').onDelete('RESTRICT');
    table.string('nombre', 100).notNullable();
    table.unique(['id_distrito', 'nombre']);
  });

  await knex.schema.table('institucion', (table) => {
    table.integer('id_localidad').unsigned().references('id_localidad').inTable('localidad').onUpdate('CASCADE').onDelete('RESTRICT');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('institucion', (table) => {
    table.dropColumn('id_localidad');
  });

  await knex.schema.dropTable('localidad');
};
