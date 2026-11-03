/**
 * Agrega la columna link_maps a la tabla cancha.
 * Reemplaza el script suelto scripts/migrate-link-maps.js.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('cancha', 'link_maps');
  if (!has) {
    await knex.schema.alterTable('cancha', (table) => {
      table.string('link_maps', 500);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('cancha', 'link_maps');
  if (has) {
    await knex.schema.alterTable('cancha', (table) => {
      table.dropColumn('link_maps');
    });
  }
};
