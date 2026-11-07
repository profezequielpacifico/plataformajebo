exports.up = async function up(knex) {
  const zonaExists = await knex.schema.hasTable('zona');
  if (!zonaExists) {
    await knex.schema.createTable('zona', (table) => {
      table.increments('id_zona').primary();
      table
        .integer('id_region')
        .unsigned()
        .notNullable()
        .references('id_region')
        .inTable('region');
      table.string('nombre', 150).notNullable();
      table.text('descripcion');
    });
  }

  const hasZoneInDistrito = await knex.schema.hasColumn('distrito', 'id_zona');
  if (!hasZoneInDistrito) {
    await knex.schema.alterTable('distrito', (table) => {
      table
        .integer('id_zona')
        .unsigned()
        .nullable()
        .references('id_zona')
        .inTable('zona');
    });
  }

  const hasEstadoTorneo = await knex.schema.hasColumn('posicion', 'estado_torneo');
  if (!hasEstadoTorneo) {
    await knex.schema.alterTable('posicion', (table) => {
      table.string('estado_torneo', 20).defaultTo('16avos');
    });
  }

  const profRole = await knex('rol').where('descripcion', 'Profesor').first();
  if (!profRole) {
    await knex('rol').insert({ descripcion: 'Profesor' });
  }
};

exports.down = async function down(knex) {
  const hasEstadoTorneo = await knex.schema.hasColumn('posicion', 'estado_torneo');
  if (hasEstadoTorneo) {
    await knex.schema.alterTable('posicion', (table) => {
      table.dropColumn('estado_torneo');
    });
  }

  const hasZoneInDistrito = await knex.schema.hasColumn('distrito', 'id_zona');
  if (hasZoneInDistrito) {
    await knex.schema.alterTable('distrito', (table) => {
      table.dropColumn('id_zona');
    });
  }

  await knex.schema.dropTableIfExists('zona');
  await knex('rol').where('descripcion', 'Profesor').del();
};
