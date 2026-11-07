exports.up = async function up(knex) {
  await knex.schema.alterTable('disciplina', (t) => {
    t.enu('tipo_competencia', ['MARCADOR', 'EVALUACION'])
      .notNullable()
      .defaultTo('MARCADOR');
  });

  await knex.schema.createTable('presentacion', (t) => {
    t.increments('id_presentacion').primary();
    t.integer('id_torneo').unsigned().notNullable().references('id_torneo').inTable('torneo').onDelete('CASCADE');
    t.integer('id_disciplina').unsigned().notNullable().references('id_disciplina').inTable('disciplina');
    t.integer('orden').notNullable();
    t.enu('estado', ['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'])
      .notNullable()
      .defaultTo('PROGRAMADA');
    t.timestamp('fecha_hora', { useTz: true });
    t.integer('id_disponibilidad').unsigned().nullable().references('id_disponibilidad').inTable('disponibilidad_cancha');
    t.timestamp('creado_en', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('actualizado_en', { useTz: true }).defaultTo(knex.fn.now());

    t.unique(['id_torneo', 'orden']);
    t.index(['id_torneo', 'estado']);
  });

  await knex.schema.createTable('presentacion_participante', (t) => {
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_equipo').unsigned().notNullable().references('id_equipo').inTable('equipo').onDelete('CASCADE');
    t.enu('rol', ['INDIVIDUAL', 'PAREJA', 'GRUPO']).notNullable();
    t.integer('orden_salida').notNullable();
    t.primary(['id_presentacion', 'id_equipo']);
    t.unique(['id_presentacion', 'orden_salida']);
  });

  await knex.schema.createTable('equipo_integrante', (t) => {
    t.integer('id_equipo').unsigned().notNullable().references('id_equipo').inTable('equipo').onDelete('CASCADE');
    t.integer('id_usuario').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    t.string('rol', 30).notNullable().defaultTo('GIMNASTA');
    t.primary(['id_equipo', 'id_usuario']);
  });

  await knex.schema.createTable('configuracion_puntaje', (t) => {
    t.increments('id_config').primary();
    t.integer('id_torneo').unsigned().notNullable().references('id_torneo').inTable('torneo').onDelete('CASCADE');
    t.integer('id_disciplina').unsigned().notNullable().references('id_disciplina').inTable('disciplina');
    t.decimal('peso_dificultad', 5, 2).defaultTo(1.00);
    t.decimal('peso_ejecucion', 5, 2).defaultTo(1.00);
    t.decimal('peso_artistico', 5, 2).defaultTo(1.00);
    t.decimal('peso_sincronizacion', 5, 2).defaultTo(1.00);
    t.decimal('max_dificultad', 6, 2);
    t.decimal('max_ejecucion', 6, 2);
    t.decimal('max_artistico', 6, 2);
    t.decimal('max_sincronizacion', 6, 2);
    t.integer('descartar_mejor').defaultTo(0);
    t.integer('descartar_peor').defaultTo(0);
    t.decimal('max_penalizaciones', 6, 2);
    t.unique(['id_torneo', 'id_disciplina']);
  });

  await knex.schema.createTable('staff_presentacion', (t) => {
    t.increments('id_staff').primary();
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_usuario').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    t.enu('rol', ['JUEZ_PRESIDENTE', 'JUEZ', 'SECRETARIO']).notNullable();
    t.unique(['id_presentacion', 'id_usuario']);
    t.index(['id_presentacion']);
  });

  const CELDAS = [
    'coord_1', 'desem_1', 'coord_2', 'desem_2',
    'coord_3', 'desem_3', 'coord_4', 'desem_4'
  ];

  await knex.schema.createTable('evaluacion', (t) => {
    t.increments('id_evaluacion').primary();
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_participante_equipo').unsigned().notNullable();
    t.integer('id_juez').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    for (const celda of CELDAS) t.integer(celda).notNullable();
    t.text('observaciones');
    t.timestamp('creado_en', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('actualizado_en', { useTz: true }).defaultTo(knex.fn.now());

    t.foreign(['id_presentacion', 'id_participante_equipo'])
      .references(['id_presentacion', 'id_equipo'])
      .inTable('presentacion_participante')
      .onDelete('CASCADE');
    t.unique(['id_presentacion', 'id_participante_equipo', 'id_juez']);
  });

  for (const celda of CELDAS) {
    await knex.raw(
      `ALTER TABLE evaluacion ADD CONSTRAINT evaluacion_${celda}_check CHECK (${celda} BETWEEN 1 AND 5)`
    );
  }

  await knex.raw(`
    CREATE OR REPLACE VIEW v_resultado_presentacion AS
    WITH por_juez AS (
      SELECT
        e.id_presentacion,
        e.id_participante_equipo,
        e.id_juez,
        (e.coord_1 + e.coord_2 + e.coord_3 + e.coord_4) AS total_coord,
        (e.desem_1 + e.desem_2 + e.desem_3 + e.desem_4) AS total_desem,
        (e.coord_1 + e.coord_2 + e.coord_3 + e.coord_4 +
         e.desem_1 + e.desem_2 + e.desem_3 + e.desem_4) AS total_juez,
        (CASE WHEN e.coord_1 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_2 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_3 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_4 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_1 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_2 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_3 >= 4 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_4 >= 4 THEN 1 ELSE 0 END) AS muy_bien_count,
        (CASE WHEN e.coord_1 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_2 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_3 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.coord_4 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_1 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_2 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_3 <= 2 THEN 1 ELSE 0 END +
         CASE WHEN e.desem_4 <= 2 THEN 1 ELSE 0 END) AS regular_count
      FROM evaluacion e
    ),
    promedio AS (
      SELECT
        id_presentacion,
        id_participante_equipo,
        ROUND(AVG(total_juez)::numeric, 2) AS puntaje_promedio,
        ROUND(AVG(total_coord)::numeric, 2) AS coord_promedio,
        SUM(muy_bien_count) AS muy_bien_total,
        SUM(regular_count) AS regular_total,
        COUNT(DISTINCT id_juez) AS jueces_count
      FROM por_juez
      GROUP BY id_presentacion, id_participante_equipo
    )
    SELECT
      p.id_presentacion,
      pp.id_equipo,
      e.nombre AS equipo_nombre,
      pr.puntaje_promedio,
      pr.coord_promedio,
      pr.muy_bien_total,
      pr.regular_total,
      pr.jueces_count,
      ROW_NUMBER() OVER (
        PARTITION BY p.id_presentacion
        ORDER BY
          pr.puntaje_promedio DESC,
          pr.coord_promedio DESC,
          pr.muy_bien_total DESC,
          pr.regular_total ASC
      ) AS ranking
    FROM promedio pr
    JOIN presentacion p ON p.id_presentacion = pr.id_presentacion
    JOIN presentacion_participante pp ON pp.id_presentacion = pr.id_presentacion AND pp.id_equipo = pr.id_participante_equipo
    JOIN equipo e ON e.id_equipo = pp.id_equipo;
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION recalcular_resultado_presentacion(p_id_presentacion INT)
    RETURNS VOID AS $$
    BEGIN
      PERFORM 1 FROM v_resultado_presentacion WHERE id_presentacion = p_id_presentacion;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Presentación % no tiene evaluaciones', p_id_presentacion;
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP FUNCTION IF EXISTS recalcular_resultado_presentacion(INT)');
  await knex.raw('DROP VIEW IF EXISTS v_resultado_presentacion');
  await knex.schema.dropTableIfExists('evaluacion');
  await knex.schema.dropTableIfExists('staff_presentacion');
  await knex.schema.dropTableIfExists('configuracion_puntaje');
  await knex.schema.dropTableIfExists('equipo_integrante');
  await knex.schema.dropTableIfExists('presentacion_participante');
  await knex.schema.dropTableIfExists('presentacion');
  await knex.schema.alterTable('disciplina', (t) => {
    t.dropColumn('tipo_competencia');
  });
};