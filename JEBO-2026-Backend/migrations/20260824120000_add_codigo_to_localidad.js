/**
 * Agrega la columna codigo a la tabla localidad.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.table('localidad', (table) => {
    table.string('codigo', 20).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('localidad', (table) => {
    table.dropColumn('codigo');
  });
};
