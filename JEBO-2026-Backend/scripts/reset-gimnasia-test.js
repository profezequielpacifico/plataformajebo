process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '15432';
process.env.DB_USER = process.env.DB_USER || 'jebo';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'jebo_secret_change_me';
process.env.DB_NAME = process.env.DB_NAME || 'jebo_2026_test';

const knex = require('../src/config/knex');
const logger = require('../src/config/logger');

const MIGRACIONES = [
  '20260930100000_gimnasia_evaluacion.js',
  '20261002190000_resultado_solo_jurado.js'
];

const OBJETOS_A_TIRAR = [
  'DROP VIEW IF EXISTS v_resultado_presentacion',
  'DROP FUNCTION IF EXISTS recalcular_resultado_presentacion(INT)',
  'DROP TABLE IF EXISTS evaluacion',
  'DROP TABLE IF EXISTS staff_presentacion',
  'DROP TABLE IF EXISTS configuracion_puntaje',
  'DROP TABLE IF EXISTS equipo_integrante',
  'DROP TABLE IF EXISTS presentacion_participante',
  'DROP TABLE IF EXISTS presentacion'
];

async function main() {
  if (!process.env.DB_NAME.endsWith('_test')) {
    throw new Error(
      `Este script solo corre contra la base de test (DB_NAME="${process.env.DB_NAME}"). ` +
      'Abortando para no tocar la base de desarrollo.'
    );
  }

  logger.info(`Base: ${process.env.DB_NAME}`);

  for (const sql of OBJETOS_A_TIRAR) {
    await knex.raw(sql);
  }
  logger.info('Objetos de gimnasia anteriores eliminados.');

  const { rows } = await knex.raw(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'disciplina' AND column_name = 'tipo_competencia'`
  );
  if (rows.length) {
    await knex.raw('ALTER TABLE disciplina DROP COLUMN tipo_competencia');
    logger.info('Columna disciplina.tipo_competencia previa eliminada.');
  }

  for (const nombre of MIGRACIONES) {
    const migracion = require(`../migrations/${nombre}`);
    try {
      await migracion.up(knex);
    } catch (err) {
      throw new Error(`${nombre}.up() fallo: ${err.message}`);
    }
    await knex('knex_migrations').insert({ name: nombre, batch: 1 });
    logger.info(`Migración aplicada: ${nombre}`);
  }

  const applied = await knex('knex_migrations').whereIn('name', MIGRACIONES).orderBy('id');
  logger.info(`Listo. ${applied.length} migraciones registradas.`);
}

main()
  .catch((err) => {
    const detalle = err.message || JSON.stringify(err, Object.getOwnPropertyNames(err));
    process.stderr.write(`reset-gimnasia-test fallo: ${detalle}\n`);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
