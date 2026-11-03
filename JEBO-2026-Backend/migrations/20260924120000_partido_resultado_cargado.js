exports.up = async function (knex) {
  await knex.schema.alterTable('partido', (table) => {
    table.boolean('resultado_cargado').notNullable().defaultTo(false);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('partido', (table) => {
    table.dropColumn('resultado_cargado');
  });
};