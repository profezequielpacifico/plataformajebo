/**
 * Reloj de partido y rol del arbitro.
 *
 * Son las dos columnas que sostienen el modulo de carga de partido, y van en
 * una migracion propia porque no dependen de nada mas: ni de `evento_partido`
 * ni de la vista de marcador. Asi el rollback es limpio si el modulo entero se
 * deja de lado.
 *
 * El reloj NO guarda un contador que se incrementa cada segundo. Guarda el
 * instante en que arranco el segmento en curso mas lo acumulado de los
 * segmentos anteriores, y el tiempo se deriva:
 *
 *   EN_CURSO -> reloj_acumulado_seg + (now() - reloj_iniciado_en)
 *   PAUSADO  -> reloj_acumulado_seg
 *
 * Un contador guardado se desincroniza con las pausas, con un reinicio del
 * proceso y con cualquier correccion manual. Esta formula no tiene estado que
 * pueda mentir, y hace que `PAUSAR` sea la unica operacion que necesita
 * escribir: acumula en el momento de la pausa y pone `reloj_iniciado_en` en
 * NULL.
 *
 * `partido.estado` sigue siendo `varchar(20)` sin CHECK, asi que el estado
 * 'Suspendido' no necesita migracion: se agrega a ESTADOS_PARTIDO y alcanza.
 */
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('partido', 'reloj_estado'))) {
    await knex.schema.alterTable('partido', (table) => {
      table
        .string('reloj_estado', 20)
        .notNullable()
        .defaultTo('PENDIENTE')
        .comment('PENDIENTE | EN_CURSO | PAUSADO | FINALIZADO');
    });
  }

  if (!(await knex.schema.hasColumn('partido', 'reloj_iniciado_en'))) {
    await knex.schema.alterTable('partido', (table) => {
      // NULL salvo que el reloj este EN_CURSO. Es la distincion que permite
      // que la formula derive el tiempo sin una columna booleana extra.
      table
        .timestamp('reloj_iniciado_en')
        .nullable()
        .comment('Instante en que arranco el segmento en curso');
    });
  }

  if (!(await knex.schema.hasColumn('partido', 'reloj_acumulado_seg'))) {
    await knex.schema.alterTable('partido', (table) => {
      table
        .integer('reloj_acumulado_seg')
        .notNullable()
        .defaultTo(0)
        .comment('Segundos acumulados de segmentos ya pausados');
    });
  }

  // Consulta operativa: "que partidos estan en curso ahora", que es la que va
  // a alimentar el tablero en vivo. Es un indice parcial porque el filtro
  // `reloj_estado = 'EN_CURSO'` ya selecciona una fraccion pequena de la tabla:
  // indexar toda la columna daria casi el mismo costo y ocuparia mas.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS partido_reloj_en_curso_ix
      ON partido (reloj_iniciado_en)
      WHERE reloj_estado = 'EN_CURSO'
  `);

  if (!(await knex.schema.hasColumn('staff_partido', 'rol'))) {
    await knex.schema.alterTable('staff_partido', (table) => {
      // DEFAULT 'ASISTENTE' para que las filas existentes sigan siendo validas
      // sin backfill. Se eligio ese default y no 'PRINCIPAL' a proposito: si el
      // default fuera PRINCIPAL, un partido con tres arbitros heredados
      // devolveria tres principales sin que nadie lo haya decidido.
      table
        .string('rol', 20)
        .notNullable()
        .defaultTo('ASISTENTE')
        .comment('PRINCIPAL | ASISTENTE');
    });
  }

  await knex.raw(`
    ALTER TABLE staff_partido
      DROP CONSTRAINT IF EXISTS staff_partido_rol_ck
  `);
  await knex.raw(`
    ALTER TABLE staff_partido
      ADD CONSTRAINT staff_partido_rol_ck
      CHECK (rol IN ('PRINCIPAL', 'ASISTENTE'))
  `);
};

exports.down = async function down(knex) {
  await knex.raw('ALTER TABLE staff_partido DROP CONSTRAINT IF EXISTS staff_partido_rol_ck');

  if (await knex.schema.hasColumn('staff_partido', 'rol')) {
    await knex.schema.alterTable('staff_partido', (table) => {
      table.dropColumn('rol');
    });
  }

  await knex.raw('DROP INDEX IF EXISTS partido_reloj_en_curso_ix');

  for (const columna of ['reloj_acumulado_seg', 'reloj_iniciado_en', 'reloj_estado']) {
    if (await knex.schema.hasColumn('partido', columna)) {
      await knex.schema.alterTable('partido', (table) => {
        table.dropColumn(columna);
      });
    }
  }
};
