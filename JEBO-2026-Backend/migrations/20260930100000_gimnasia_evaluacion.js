/**
 * Gimnasia Acrobática Escolar — modelo de evaluación (JEBO 2026).
 *
 * Separado del modelo de "partido + eventos" porque:
 * - No hay anotaciones (goles/puntos) que se sumen en vivo.
 * - El resultado sale de una planilla de 3 jueces × 4 momentos × 2 dimensiones.
 * - Rangos fijos: Regular 1-2, Bien 3, Muy Bien 4-5.
 * - Total por juez = Σ(Coordinación 1..4) + Σ(Desempeño 1..4) ∈ [8, 40].
 * - Nota final = promedio de los 3 totales de juez.
 * - Desempate: 1) mayor Coordinación  2) más "Muy Bien"  3) menos "Regular"  4) moneda.
 */
exports.up = async function up(knex) {
  // 1) disciplina.tipo_competencia
  await knex.schema.alterTable('disciplina', (t) => {
    t.enu('tipo_competencia', ['MARCADOR', 'EVALUACION'])
      .notNullable()
      .defaultTo('MARCADOR');
  });

  // 2) presentacion (reemplaza a partido para EVALUACION)
  await knex.schema.createTable('presentacion', (t) => {
    t.increments('id_presentacion').primary();
    t.integer('id_torneo').unsigned().notNullable().references('id_torneo').inTable('torneo').onDelete('CASCADE');
    t.integer('id_disciplina').unsigned().notNullable().references('id_disciplina').inTable('disciplina');
    // Sin `id_categoria`: la tabla `categoria` no existe en el modelo y ningun
    // servicio la usa. Con esa linea la migracion reventaba al correr contra una
    // base limpia ("relation categoria does not exist"), asi que el modulo entero
    // solo existia en la base de desarrollo, aplicada a mano y recortada.
    t.integer('orden').notNullable();                    // orden de salida
    t.enu('estado', ['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'])
      .notNullable()
      .defaultTo('PROGRAMADA');
    // `timestamptz` no es un metodo del table builder de knex (existen `timestamp`
    // con `{ useTz: true }` y `dateTime`): con el nombre corto la migracion
    // reventaba con "t.timestamptz is not a function".
    t.timestamp('fecha_hora', { useTz: true });
    t.integer('id_disponibilidad').unsigned().nullable().references('id_disponibilidad').inTable('disponibilidad_cancha');
    t.timestamp('creado_en', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('actualizado_en', { useTz: true }).defaultTo(knex.fn.now());

    t.unique(['id_torneo', 'orden']);
    t.index(['id_torneo', 'estado']);
  });

  // 3) presentacion_participante (equipo/trío en una presentación)
  await knex.schema.createTable('presentacion_participante', (t) => {
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_equipo').unsigned().notNullable().references('id_equipo').inTable('equipo').onDelete('CASCADE');
    t.enu('rol', ['INDIVIDUAL', 'PAREJA', 'GRUPO']).notNullable();
    t.integer('orden_salida').notNullable();
    t.primary(['id_presentacion', 'id_equipo']);
    t.unique(['id_presentacion', 'orden_salida']);
  });

  // 4) equipo_integrante (gimnastas dentro del equipo)
  await knex.schema.createTable('equipo_integrante', (t) => {
    t.integer('id_equipo').unsigned().notNullable().references('id_equipo').inTable('equipo').onDelete('CASCADE');
    t.integer('id_usuario').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    t.string('rol', 30).notNullable().defaultTo('GIMNASTA'); // 'GIMNASTA', 'COACH', etc.
    t.primary(['id_equipo', 'id_usuario']);
  });

  // 5) configuracion_puntaje (por torneo/disciplina)
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

  // 6) staff_presentacion (jueces, no árbitros)
  await knex.schema.createTable('staff_presentacion', (t) => {
    t.increments('id_staff').primary();
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_usuario').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    t.enu('rol', ['JUEZ_PRESIDENTE', 'JUEZ', 'SECRETARIO']).notNullable();
    t.unique(['id_presentacion', 'id_usuario']);
    t.index(['id_presentacion']);
  });

  // 4 momentos × 2 dimensiones = 8 celdas. El rango 1..5 de cada una se agrega
  // despues como CHECK: `column.checkBetween()` no existe en el table builder de
  // knex, y con las ocho llamadas la migracion reventaba a mitad de camino
  // dejando `evaluacion` sin crear.
  const CELDAS = [
    'coord_1', 'desem_1', 'coord_2', 'desem_2',
    'coord_3', 'desem_3', 'coord_4', 'desem_4'
  ];

  // 7) evaluacion (hoja de un juez para un participante en una presentación)
  await knex.schema.createTable('evaluacion', (t) => {
    t.increments('id_evaluacion').primary();
    t.integer('id_presentacion').unsigned().notNullable().references('id_presentacion').inTable('presentacion').onDelete('CASCADE');
    t.integer('id_participante_equipo').unsigned().notNullable(); // FK compuesta abajo
    t.integer('id_juez').unsigned().notNullable().references('id_usuario').inTable('usuario').onDelete('CASCADE');
    for (const celda of CELDAS) t.integer(celda).notNullable();
    t.text('observaciones');
    t.timestamp('creado_en', { useTz: true }).defaultTo(knex.fn.now());
    t.timestamp('actualizado_en', { useTz: true }).defaultTo(knex.fn.now());

    // FK compuesta a presentacion_participante
    t.foreign(['id_presentacion', 'id_participante_equipo'])
      .references(['id_presentacion', 'id_equipo'])
      .inTable('presentacion_participante')
      .onDelete('CASCADE');
    t.unique(['id_presentacion', 'id_participante_equipo', 'id_juez']);
  });

  // Rango 1..5 de cada celda de la hoja. Van como ALTER aparte porque knex no
  // expone un check por columna; el nombre sigue la convencion que ya usaba la
  // base de desarrollo (evaluacion_<columna>_check).
  for (const celda of CELDAS) {
    await knex.raw(
      `ALTER TABLE evaluacion ADD CONSTRAINT evaluacion_${celda}_check CHECK (${celda} BETWEEN 1 AND 5)`
    );
  }

  // 8) Vista: resultado final por presentación (promedio 3 jueces + desempate)
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
        -- Conteo de "Muy Bien" (4 o 5) y "Regular" (1 o 2) para desempate
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
      -- Ranking aplicando desempate
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

  // 9) Función para recalcular resultado (llamable desde service)
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recalcular_resultado_presentacion(p_id_presentacion INT)
    RETURNS VOID AS $$
    BEGIN
      -- La vista v_resultado_presentacion ya tiene la lógica completa.
      -- Esta función existe para que el service tenga un punto de entrada único
      -- y poder añadir bitácora / notificaciones si se necesita.
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