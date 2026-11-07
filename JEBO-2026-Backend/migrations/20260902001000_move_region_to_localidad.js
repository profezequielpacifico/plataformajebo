exports.up = async function (knex) {
  const localidadHasRegion = await knex.schema.hasColumn('localidad', 'id_region');
  if (!localidadHasRegion) {
    await knex.schema.alterTable('localidad', (table) => {
      table.integer('id_region').unsigned().nullable().references('id_region').inTable('region');
    });

    await knex('localidad')
      .update({
        id_region: knex.raw('(SELECT d.id_region FROM distrito d WHERE d.id_distrito = localidad.id_distrito)')
      });
  }

  const distritoHasRegion = await knex.schema.hasColumn('distrito', 'id_region');
  if (distritoHasRegion) {
    await knex.raw('ALTER TABLE distrito DROP CONSTRAINT IF EXISTS distrito_id_region_fkey');
    await knex.raw('ALTER TABLE distrito DROP CONSTRAINT IF EXISTS distrito_id_region_foreign');
    await knex.schema.alterTable('distrito', (table) => {
      table.dropColumn('id_region');
    });
  }

  const localidadUnique = await knex.raw("SELECT COUNT(*) AS c FROM information_schema.table_constraints WHERE constraint_type = 'UNIQUE' AND table_name = 'localidad' AND constraint_name = 'localidad_id_distrito_nombre_unique'");
  const hasUnique = parseInt(localidadUnique.rows[0].c, 10) > 0;
  if (hasUnique) {
    await knex.schema.alterTable('localidad', (table) => {
      table.dropUnique(['id_distrito', 'nombre']);
    });
  }
  await knex.schema.alterTable('localidad', (table) => {
    table.unique(['id_region', 'id_distrito', 'nombre']);
  });
};

exports.down = async function (knex) {
  const distritoHasRegion = await knex.schema.hasColumn('distrito', 'id_region');
  if (!distritoHasRegion) {
    await knex.schema.alterTable('distrito', (table) => {
      table.integer('id_region').unsigned().nullable().references('id_region').inTable('region');
    });

    await knex('distrito')
      .distinct()
      .update({
        id_region: knex.raw('(SELECT l.id_region FROM localidad l WHERE l.id_distrito = distrito.id_distrito LIMIT 1)')
      });
  }

  const localidadHasRegion = await knex.schema.hasColumn('localidad', 'id_region');
  if (localidadHasRegion) {
    await knex.raw('ALTER TABLE localidad DROP CONSTRAINT IF EXISTS localidad_id_region_fkey');
    await knex.raw('ALTER TABLE localidad DROP CONSTRAINT IF EXISTS localidad_id_region_foreign');
    await knex.schema.alterTable('localidad', (table) => {
      table.dropColumn('id_region');
    });
  }

  await knex.schema.alterTable('localidad', (table) => {
    table.unique(['id_distrito', 'nombre']);
  });
};
