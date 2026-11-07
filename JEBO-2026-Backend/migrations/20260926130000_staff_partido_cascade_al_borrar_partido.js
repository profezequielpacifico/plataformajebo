exports.up = async function up(knex) {
  await knex.raw('ALTER TABLE staff_partido DROP CONSTRAINT IF EXISTS staff_partido_id_partido_fkey');
  await knex.raw(`
    ALTER TABLE staff_partido
      ADD CONSTRAINT staff_partido_id_partido_fkey
      FOREIGN KEY (id_partido) REFERENCES partido(id_partido)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  `);

  if (!(await knex.schema.hasTable('scoring_formulas'))) {
    await knex.schema.createTable('scoring_formulas', (table) => {
      table.increments('id_configuracion').primary();
      table.string('nombre', 100).notNullable().unique();
      table.string('tipo', 50).notNullable();
      table.jsonb('configuracion_json').notNullable();
      table.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
      table.timestamp('actualizado_en').notNullable().defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('scoring_formulas');

  await knex.raw('ALTER TABLE staff_partido DROP CONSTRAINT IF EXISTS staff_partido_id_partido_fkey');
  await knex.raw(`
    ALTER TABLE staff_partido
      ADD CONSTRAINT staff_partido_id_partido_fkey
      FOREIGN KEY (id_partido) REFERENCES partido(id_partido)
  `);
};
