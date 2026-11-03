/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('etapa', (table) => {
    table.increments('id_etapa').primary();
    table.integer('id_torneo').unsigned().notNullable().references('id_torneo').inTable('torneo').onUpdate('CASCADE').onDelete('RESTRICT');
    table.string('nombre', 150).notNullable();
    table.integer('orden').notNullable();
    table.text('descripcion');
    table.string('estado', 50).defaultTo('Pendiente');
    table.date('fecha_inicio');
    table.date('fecha_fin');
  });

  await knex.schema.alterTable('etapa', (table) => {
    table.unique(['id_torneo', 'orden'], { indexName: 'uq_etapa_torneo_orden' });
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_etapa_fechas'
      ) THEN
        ALTER TABLE etapa
          ADD CONSTRAINT chk_etapa_fechas
          CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio);
      END IF;
    END $$;
  `);

  await knex.schema.alterTable('torneo', (table) => {
    table.timestamp('fecha_inscripcion_inicio').nullable();
    table.timestamp('fecha_inscripcion_fin').nullable();
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_torneo_inscripcion_fechas'
      ) THEN
        ALTER TABLE torneo
          ADD CONSTRAINT chk_torneo_inscripcion_fechas
          CHECK (
            fecha_inscripcion_fin IS NULL
            OR fecha_inscripcion_inicio IS NULL
            OR fecha_inscripcion_fin >= fecha_inscripcion_inicio
          );
      END IF;
    END $$;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.alterTable('torneo', (table) => {
    table.dropColumn('fecha_inscripcion_inicio');
    table.dropColumn('fecha_inscripcion_fin');
  });

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_etapa_fechas'
      ) THEN
        ALTER TABLE etapa DROP CONSTRAINT chk_etapa_fechas;
      END IF;
    END $$;
  `);

  await knex.schema.alterTable('etapa', (table) => {
    table.dropUnique(['id_torneo', 'orden'], 'uq_etapa_torneo_orden');
  });

  await knex.schema.table('posicion', (table) => {
    table.dropColumn('id_etapa');
  });

  await knex.schema.table('partido', (table) => {
    table.dropColumn('id_etapa');
  });

  await knex.schema.dropTable('etapa');
};
