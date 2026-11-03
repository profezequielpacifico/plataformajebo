/**
 * Corrective migration: applies DDL changes that were marked as applied
 * in knex_migrations but did not actually execute on the restored DB.
 *
 * Affected tables:
 *  - institucion: add id_localidad (from 003)
 *  - distrito: drop id_zona + zona FK (from 009)
 *  - zona: drop table (from 009)
 *  - distrito: drop id_region (from 010)
 *  - localidad: update unique constraint (from 010)
 *  - equipo: add id_distrito (from 011)
 */
exports.up = async function (knex) {
  // 1. institucion: add id_localidad if missing
  const instHasLocalidad = await knex.schema.hasColumn('institucion', 'id_localidad');
  if (!instHasLocalidad) {
    await knex.schema.alterTable('institucion', (table) => {
      table.integer('id_localidad').unsigned().nullable()
        .references('id_localidad').inTable('localidad')
        .onUpdate('CASCADE').onDelete('RESTRICT');
    });
  }

  // 2. distrito: drop id_zona FK + column if present
  const distHasZona = await knex.schema.hasColumn('distrito', 'id_zona');
  if (distHasZona) {
    await knex.raw('ALTER TABLE distrito DROP CONSTRAINT IF EXISTS distrito_id_zona_foreign');
    await knex.schema.alterTable('distrito', (table) => {
      table.dropColumn('id_zona');
    });
  }

  // 3. zona: drop table if it still exists
  await knex.schema.dropTableIfExists('zona');

  // 4. distrito: drop id_region FK + column if present
  const distHasRegion = await knex.schema.hasColumn('distrito', 'id_region');
  if (distHasRegion) {
    await knex.raw('ALTER TABLE distrito DROP CONSTRAINT IF EXISTS distrito_id_region_fkey');
    await knex.raw('ALTER TABLE distrito DROP CONSTRAINT IF EXISTS distrito_id_region_foreign');
    await knex.schema.alterTable('distrito', (table) => {
      table.dropColumn('id_region');
    });
  }

  // 5. localidad: replace unique constraint (id_distrito,nombre) -> (id_region,id_distrito,nombre)
  const hasOldUnique = await knex.raw(
    "SELECT 1 FROM pg_constraint WHERE conname = 'localidad_id_distrito_nombre_unique' AND conrelid = 'localidad'::regclass"
  );
  if (hasOldUnique.rows.length) {
    await knex.schema.alterTable('localidad', (table) => {
      table.dropUnique(['id_distrito', 'nombre']);
    });
  }
  const hasNewUnique = await knex.raw(
    "SELECT 1 FROM pg_constraint WHERE conname = 'localidad_id_region_id_distrito_nombre_unique' AND conrelid = 'localidad'::regclass"
  );
  if (!hasNewUnique.rows.length) {
    await knex.schema.alterTable('localidad', (table) => {
      table.unique(['id_region', 'id_distrito', 'nombre']);
    });
  }

  // 6. equipo: add id_distrito if missing
  const equipoHasDistrito = await knex.schema.hasColumn('equipo', 'id_distrito');
  if (!equipoHasDistrito) {
    await knex.schema.alterTable('equipo', (table) => {
      table.integer('id_distrito').unsigned().nullable()
        .references('id_distrito').inTable('distrito')
        .onUpdate('CASCADE').onDelete('RESTRICT');
    });

    // backfill from institucion
    await knex.raw(`
      UPDATE equipo e
         SET id_distrito = i.id_distrito
        FROM institucion i
       WHERE e.id_institucion = i.id_institucion
         AND e.id_distrito IS NULL
    `);
  }
};

exports.down = async function (knex) {
  // reverse in inverse order
  await knex.schema.alterTable('equipo', (table) => {
    table.dropColumn('id_distrito');
  });

  await knex.schema.alterTable('localidad', (table) => {
    table.dropUnique(['id_region', 'id_distrito', 'nombre']);
    table.unique(['id_distrito', 'nombre']);
  });

  await knex.schema.alterTable('distrito', (table) => {
    table.integer('id_region').unsigned().notNullable()
      .references('id_region').inTable('region');
  });

  await knex.schema.createTable('zona', (table) => {
    table.increments('id_zona').primary();
    table.integer('id_region').unsigned().notNullable()
      .references('id_region').inTable('region');
    table.string('nombre', 150).notNullable();
    table.text('descripcion');
  });

  await knex.schema.alterTable('distrito', (table) => {
    table.integer('id_zona').unsigned().nullable()
      .references('id_zona').inTable('zona');
  });

  await knex.schema.alterTable('institucion', (table) => {
    table.dropColumn('id_localidad');
  });
};
