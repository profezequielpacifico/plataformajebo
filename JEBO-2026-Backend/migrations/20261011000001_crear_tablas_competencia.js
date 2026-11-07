exports.up = async function (knex) {
  await knex.schema.createTable('competencia', (table) => {
    table.increments('id_competencia').primary();
    table.text('nombre').notNullable();
    table.text('descripcion');
    table.string('estado', 20).notNullable().defaultTo('BORRADOR');
    table.jsonb('configuracion').notNullable().defaultTo('{}');
    table.timestamp('fecha_creacion', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('fecha_actualizacion', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(`estado IN ('BORRADOR', 'CONFIGURADA', 'EN_CURSO', 'FINALIZADA', 'SUSPENDIDA')`);
  });

  await knex.schema.createTable('competencia_etapa', (table) => {
    table.increments('id_competencia_etapa').primary();
    table.integer('id_competencia').unsigned().notNullable()
      .references('id_competencia').inTable('competencia').onDelete('RESTRICT');
    table.integer('id_etapa').unsigned().nullable()
      .references('id_etapa').inTable('etapa').onDelete('RESTRICT');
    table.string('nombre', 255).notNullable();
    table.integer('orden').notNullable();
    table.string('tipo', 50);
    table.boolean('es_final').notNullable().defaultTo(false);
    table.string('estado', 20).notNullable().defaultTo('BORRADOR');
    table.jsonb('configuracion').notNullable().defaultTo('{}');
    table.boolean('activo').notNullable().defaultTo(true);
    table.timestamp('creado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('actualizado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['id_competencia', 'orden'], { indexName: 'uq_competencia_etapa_orden' });
    table.check(`orden > 0`);
    table.check(`estado IN ('BORRADOR', 'CONFIGURADA', 'LISTA', 'EN_CURSO', 'FINALIZADA', 'BLOQUEADA', 'CANCELADA')`);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX uq_competencia_etapa_legacy
    ON competencia_etapa(id_etapa)
    WHERE id_etapa IS NOT NULL
  `);

  await knex.schema.createTable('etapa_regla', (table) => {
    table.increments('id_etapa_regla').primary();
    table.integer('id_competencia_etapa').unsigned().notNullable()
      .references('id_competencia_etapa').inTable('competencia_etapa').onDelete('RESTRICT');
    table.string('tipo', 30).notNullable();
    table.jsonb('configuracion').notNullable();
    table.integer('orden').notNullable().defaultTo(1);
    table.boolean('activa').notNullable().defaultTo(true);
    table.timestamp('creado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(`tipo IN ('PARTICIPANTES', 'COMPETICION', 'CLASIFICACION')`);
    table.check(`orden > 0`);
  });

  await knex.raw(`
    CREATE INDEX idx_etapa_regla_activa
    ON etapa_regla(id_competencia_etapa, tipo)
    WHERE activa = TRUE
  `);

  await knex.schema.createTable('etapa_restriccion', (table) => {
    table.increments('id_etapa_restriccion').primary();
    table.integer('id_competencia_etapa').unsigned().notNullable()
      .references('id_competencia_etapa').inTable('competencia_etapa').onDelete('RESTRICT');
    table.string('tipo', 30).notNullable();
    table.string('operador', 10).notNullable();
    table.jsonb('valor_json').notNullable();
    table.boolean('activo').notNullable().defaultTo(true);

    table.check(`tipo IN ('REGION', 'DISTRITO', 'LOCALIDAD', 'INSTITUCION', 'CATEGORIA')`);
    table.check(`operador IN ('IGUAL', 'IN', 'NOT_IN')`);
  });

  await knex.schema.createTable('etapa_participante', (table) => {
    table.increments('id_etapa_participante').primary();
    table.integer('id_competencia_etapa').unsigned().notNullable()
      .references('id_competencia_etapa').inTable('competencia_etapa').onDelete('RESTRICT');
    table.integer('equipo_id').unsigned().notNullable()
      .references('id_equipo').inTable('equipo').onDelete('RESTRICT');
    table.integer('id_etapa_origen').unsigned().nullable()
      .references('id_competencia_etapa').inTable('competencia_etapa').onDelete('RESTRICT');
    table.string('origen_tipo', 30);
    table.string('origen_clave', 100);
    table.integer('id_encuentro_origen').unsigned().nullable()
      .references('id_partido').inTable('partido').onDelete('SET NULL');
    table.integer('posicion_origen');
    table.string('motivo', 30).notNullable();
    table.integer('orden_llave');
    table.integer('orden_insercion').notNullable();
    table.timestamp('creado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['id_competencia_etapa', 'equipo_id'], { indexName: 'uq_etapa_participante_equipo' });
    table.unique(['id_competencia_etapa', 'orden_insercion'], { indexName: 'uq_etapa_participante_orden' });

    table.check(`orden_insercion > 0`);
    table.check(`motivo IN ('CLASIFICADO_POR_POSICION', 'CLASIFICADO_POR_REPECHAJE', 'WILDCARD', 'INVITADO')`);
  });

  await knex.raw(`
    CREATE INDEX idx_etapa_participante_origen
    ON etapa_participante(id_etapa_origen)
  `);

  await knex.raw(`
    CREATE INDEX idx_etapa_participante_equipo
    ON etapa_participante(equipo_id)
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('etapa_participante');
  await knex.schema.dropTableIfExists('etapa_restriccion');
  await knex.schema.dropTableIfExists('etapa_regla');
  await knex.raw('DROP INDEX IF EXISTS uq_competencia_etapa_legacy');
  await knex.schema.dropTableIfExists('competencia_etapa');
  await knex.schema.dropTableIfExists('competencia');
};
