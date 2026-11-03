/**
 * DELETE /matches/:id quedaba permanentemente bloqueado en cuanto el partido
 * tenía árbitros cargados: `staff_partido_id_partido_fkey` no declaraba
 * ON DELETE y la fila de `staff_partido` impedía el borrado, devolviendo 500.
 *
 * No había forma de destrabarlo: la API no expone ningún endpoint para quitar
 * árbitros de un partido, así que un partido con officials asignados no podía
 * eliminarse nunca.
 *
 * `partido_ronda_id_partido_foreign` ya usa ON DELETE CASCADE para el mismo
 * padre, así que esto alinea `staff_partido` con la convención que el propio
 * esquema ya usa. `staff_partido` es tabla hoja (nada la referencia), así que la
 * cascada no elimina historial del que alguien dependa: las asignaciones de
 * Officials solo tienen sentido mientras el partido existe.
 */
exports.up = async function up(knex) {
  await knex.raw('ALTER TABLE staff_partido DROP CONSTRAINT IF EXISTS staff_partido_id_partido_fkey');
  await knex.raw(`
    ALTER TABLE staff_partido
      ADD CONSTRAINT staff_partido_id_partido_fkey
      FOREIGN KEY (id_partido) REFERENCES partido(id_partido)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  `);

  // Tabla para fórmulas de puntuación genéricas (diferente de configuracion_puntaje de gimnasia).
  // Renombrada a scoring_formulas para evitar colisión con la migración 20260930100000_gimnasia_evaluacion.js
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
