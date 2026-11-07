exports.up = async function up(knex) {
  await knex.schema.createTable('evento_partido', (table) => {
    table.increments('id_evento').primary();

    table
      .integer('id_partido')
      .notNullable()
      .references('id_partido')
      .inTable('partido')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.integer('numero_evento').notNullable();

    table.string('tipo_evento', 30).notNullable().defaultTo('ANOTACION');

    table
      .integer('id_equipo')
      .notNullable()
      .references('id_equipo')
      .inTable('equipo')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table
      .integer('id_usuario_arbitro')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table
      .integer('registrado_por')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    table.integer('segundos_partido').nullable();

    table.timestamp('hora_real').notNullable().defaultTo(knex.fn.now());

    table.string('estado', 20).notNullable().defaultTo('CONFIRMADO');

    table.string('idempotency_key', 64).nullable();

    table
      .integer('anulado_por')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.timestamp('anulado_en').nullable();
    table.text('motivo_anulacion').nullable();

    table.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
  });

  await knex.raw(`
    CREATE UNIQUE INDEX evento_partido_partido_numero_uk
      ON evento_partido (id_partido, numero_evento)
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX evento_partido_idem_uk
      ON evento_partido (id_partido, idempotency_key)
      WHERE idempotency_key IS NOT NULL
  `);

  await knex.raw(`
    CREATE INDEX evento_partido_marcador_ix
      ON evento_partido (id_partido, id_equipo)
      WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
  `);

  await knex.raw(`
    CREATE INDEX evento_partido_historial_ix
      ON evento_partido (id_partido, numero_evento DESC)
  `);

  await knex.raw(`
    ALTER TABLE evento_partido
      DROP CONSTRAINT IF EXISTS evento_partido_estado_ck
  `);
  await knex.raw(`
    ALTER TABLE evento_partido
      ADD CONSTRAINT evento_partido_estado_ck
      CHECK (estado IN ('CONFIRMADO', 'ANULADO'))
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_partido_partido_usuario_uk
      ON staff_partido (id_partido, id_usuario)
  `);

  await knex.raw(`
    ALTER TABLE evento_partido
      DROP CONSTRAINT IF EXISTS evento_partido_arbitro_asignado_fkey
  `);
  await knex.raw(`
    ALTER TABLE evento_partido
      ADD CONSTRAINT evento_partido_arbitro_asignado_fkey
      FOREIGN KEY (id_partido, id_usuario_arbitro)
      REFERENCES staff_partido (id_partido, id_usuario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('evento_partido');
  await knex.raw('DROP INDEX IF EXISTS staff_partido_partido_usuario_uk');
};
