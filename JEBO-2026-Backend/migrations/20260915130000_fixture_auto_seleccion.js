exports.up = async function (knex) {
  await knex.schema.createTable('partido_ronda', (table) => {
    table.integer('id_partido').notNullable().references('id_partido').inTable('partido').onDelete('CASCADE');
    table.integer('id_ronda').notNullable();
    table.primary(['id_partido']);
    table.index(['id_ronda']);
  });

  await knex.schema.createTable('fixture_generado', (table) => {
    table.increments('id_fixture').primary();
    table.integer('id_torneo').notNullable().references('id_torneo').inTable('torneo').onDelete('CASCADE');
    table.timestamp('generado_en').notNullable().defaultTo(knex.fn.now());
    table.integer('id_usuario').references('id_usuario').inTable('usuario').onDelete('SET NULL');
    table.unique(['id_torneo']);
    table.index(['generado_en']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('fixture_generado');
  await knex.schema.dropTableIfExists('partido_ronda');
};