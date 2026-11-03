#!/usr/bin/env node
/**
 * Applies Knex migrations safely for Docker boots.
 *
 * - Empty DB → runs 001 baseline + 002 deltas
 * - DB restored from dump (tables exist, no knex_migrations) → stamps 001, runs 002+
 */
const knexLib = require('knex');
const config = require('../knexfile');

const envName = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const knex = knexLib(config[envName]);
const BASELINE = '20260624102025_001_baseline.js';

async function ensureMigrationsMeta() {
  const hasTable = await knex.schema.hasTable('knex_migrations');
  if (!hasTable) {
    await knex.schema.createTable('knex_migrations', (t) => {
      t.increments('id').primary();
      t.string('name');
      t.integer('batch');
      t.timestamp('migration_time');
    });
  }

  const hasLock = await knex.schema.hasTable('knex_migrations_lock');
  if (!hasLock) {
    await knex.schema.createTable('knex_migrations_lock', (t) => {
      t.increments('index').primary();
      t.integer('is_locked');
    });
    await knex('knex_migrations_lock').insert({ is_locked: 0 });
  }
}

async function stampBaselineIfNeeded() {
  const hasUsuario = await knex.schema.hasTable('usuario');
  if (!hasUsuario) {
    return;
  }

  await ensureMigrationsMeta();
  const stamped = await knex('knex_migrations').where({ name: BASELINE }).first();
  if (stamped) {
    return;
  }

  const [{ max }] = await knex('knex_migrations').max('batch as max');
  const batch = (max ? Number(max) : 0) + 1;
  await knex('knex_migrations').insert({
    name: BASELINE,
    batch,
    migration_time: knex.fn.now()
  });
  console.log(`Stamped ${BASELINE} (schema already present from dump).`);
}

async function main() {
  await stampBaselineIfNeeded();
  const [batch, log] = await knex.migrate.latest();
  if (log.length) {
    console.log(`Migration batch ${batch}: ${log.join(', ')}`);
  } else {
    console.log('Migrations already up to date.');
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await knex.destroy();
  });
