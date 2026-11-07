exports.up = async function(knex) {
  await knex.schema.table('localidad', (table) => {
    table.string('codigo', 20).nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('localidad', (table) => {
    table.dropColumn('codigo');
  });
};
