exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('cancha', 'link_maps');
  if (!has) {
    await knex.schema.alterTable('cancha', (table) => {
      table.string('link_maps', 500);
    });
  }
};

exports.down = async function down(knex) {
  const has = await knex.schema.hasColumn('cancha', 'link_maps');
  if (has) {
    await knex.schema.alterTable('cancha', (table) => {
      table.dropColumn('link_maps');
    });
  }
};
