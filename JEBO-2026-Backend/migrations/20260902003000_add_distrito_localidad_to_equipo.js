exports.up = async function (knex) {
  const distritoExists = await knex.schema.hasColumn('equipo', 'id_distrito');
  if (!distritoExists) {
    await knex.schema.alterTable('equipo', (table) => {
      table.integer('id_distrito').unsigned().nullable().references('id_distrito').inTable('distrito');
    });
  }

  const localidadExists = await knex.schema.hasColumn('equipo', 'id_localidad');
  if (!localidadExists) {
    await knex.schema.alterTable('equipo', (table) => {
      table.integer('id_localidad').unsigned().nullable().references('id_localidad').inTable('localidad');
    });
  }

  await knex('equipo')
    .update({
      id_distrito: knex.raw('(SELECT i.id_distrito FROM institucion i WHERE i.id_institucion = equipo.id_institucion)'),
      id_localidad: knex.raw('(SELECT i.id_localidad FROM institucion i WHERE i.id_institucion = equipo.id_institucion)')
    });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('equipo', (table) => {
    table.dropColumn('id_distrito');
    table.dropColumn('id_localidad');
  });
};
