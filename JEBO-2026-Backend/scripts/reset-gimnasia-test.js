/**
 * Deja la base de test con el esquema de gimnasia igual que lo produce la
 * migración real.
 *
 * Por qué existe: las tablas de `gimnasia_evaluacion` se habían creado a mano en
 * `jebo_2026_test` y recortadas (sin `disciplina.tipo_competencia`), sin dejar el
 * registro en `knex_migrations`. Resultado: los tests del módulo no tenían ni
 * esquema ni cobertura posible, y `POST /presentaciones` fallaba siempre en el
 * chequeo de disciplina EVALUACION.
 *
 * Borra los objetos de gimnasia de la base de test y corre el `up` de la
 * migración, como haría `knex migrate:latest`. Solo para la base de test: si
 * `DB_NAME` no termina en `_test` aborta, para que nadie la corra por error
 * contra la base de desarrollo.
 *
 * Uso: DB_HOST=127.0.0.1 DB_PORT=15432 node scripts/reset-gimnasia-test.js
 */

process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.DB_PORT || '15432';
process.env.DB_USER = process.env.DB_USER || 'jebo';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'jebo_secret_change_me';
process.env.DB_NAME = process.env.DB_NAME || 'jebo_2026_test';

const knex = require('../src/config/knex');
const logger = require('../src/config/logger');

// Se relanzan a mano, no con `knex migrate:latest`, y por eso tienen que ser la lista
// completa: la vista del resultado se creo en la primera y la filtro por jurado la
// ultima. Con solo la primera, el reset dejaba la vista promediando tambien las hojas
// de quien no es juez del jurado, y `knex_migrations` ya las daba por aplicadas, asi
// que un `migrate:latest` posterior no lo arreglaba.
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

  // `tipo_competencia` es un added by alterTable: si la base ya lo tuviera (por
  // una corrida anterior a medias) hay que sacarlo antes o el alter falla.
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
    // Se re-lanza como Error propio: los errores de esquema de Postgres llegan con
    // la causa en propiedades sueltas y el logger se los come.
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
    // A stderr y no por el logger: el logger formatea con un solo argumento y
    // se pierde el mensaje. Ademas las violaciones de esquema de Postgres llegan
    // con la causa en propiedades sueltas, asi que se las junta.
    const detalle = err.message || JSON.stringify(err, Object.getOwnPropertyNames(err));
    process.stderr.write(`reset-gimnasia-test fallo: ${detalle}\n`);
    process.exitCode = 1;
  })
  .finally(() => knex.destroy());
