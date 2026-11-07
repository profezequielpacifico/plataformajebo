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

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS partido_reloj_en_curso_ix
      ON partido (reloj_iniciado_en)
      WHERE reloj_estado = 'EN_CURSO'
  `);

  if (!(await knex.schema.hasColumn('staff_partido', 'rol'))) {
    await knex.schema.alterTable('staff_partido', (table) => {
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
