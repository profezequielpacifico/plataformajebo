exports.up = async function (knex) {
  const exists = await knex.schema.hasTable('login_intentos');
  if (exists) return;

  await knex.schema.createTable('login_intentos', (table) => {
    table.increments('id').primary();
    table.string('ip', 45).notNullable().unique();
    table.integer('failures').notNullable().defaultTo(0);
    table.timestamp('locked_until', { useTz: true }).nullable();
    table.boolean('permanente').notNullable().defaultTo(false);
    table.timestamp('actualizado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('login_intentos');
};