/**
 * Corrige la deriva entre los modelos y el esquema real de la base.
 *
 * 1) `partido.id_etapa` y `posicion.id_etapa` están declarados en
 *    src/models/partido.model.js y src/models/posicion.model.js, y el `down()` de
 *    20260821153000_estructuras_competitivas.js los dropea, pero su `up()` nunca los
 *    creó. Sin esas columnas, `actualizar_posiciones()` (creada en
 *    20260826000002) es plpgsql no validado y revienta en tiempo de ejecución, y
 *    POST /matches con `id_etapa` responde 500.
 *
 * 2) La versión anterior de `actualizar_posiciones()` hacía DELETE FROM posicion y
 *    acto seguido re-inserta desde un SELECT que leía esa misma tabla ya vacía
 *    (INNER JOIN posicion existing), por lo que insertaba 0 filas y además perdía
 *    `estado_torneo` y `creado_en`. Se reemplaza por un UPSERT que preserva ambas
 *    columnas y sigue incluyendo a los equipos inscritos que aún no jugaron.
 */
exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('partido', 'id_etapa'))) {
    await knex.schema.alterTable('partido', (table) => {
      table
        .integer('id_etapa')
        .unsigned()
        .nullable()
        .references('id_etapa')
        .inTable('etapa')
        .onUpdate('CASCADE')
        .onDelete('SET NULL');
    });
  }

  if (!(await knex.schema.hasColumn('posicion', 'id_etapa'))) {
    await knex.schema.alterTable('posicion', (table) => {
      table
        .integer('id_etapa')
        .unsigned()
        .nullable()
        .references('id_etapa')
        .inTable('etapa')
        .onUpdate('CASCADE')
        .onDelete('SET NULL');
    });
  }

  // Una fila de posicion por (equipo, torneo): si el torneo tiene etapas, la fila
  // guarda la etapa que se está contabilizando, no una fila por etapa.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION actualizar_posiciones(p_id_torneo INT, p_id_etapa INT)
    RETURNS VOID AS $$
    BEGIN
      IF p_id_torneo IS NULL THEN
        RETURN;
      END IF;

      WITH inscriptos AS MATERIALIZED (
        SELECT id_equipo
        FROM posicion
        WHERE id_torneo = p_id_torneo
      ),
      pares AS (
        SELECT
          p.id_partido,
          p.id_equipo_local  AS id_equipo,
          p.goles_local      AS gf,
          p.goles_visitante  AS gc,
          p.estado
        FROM partido p
        WHERE p.id_torneo = p_id_torneo
          AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)

        UNION ALL

        SELECT
          p.id_partido,
          p.id_equipo_visitante AS id_equipo,
          p.goles_visitante     AS gf,
          p.goles_local         AS gc,
          p.estado
        FROM partido p
        WHERE p.id_torneo = p_id_torneo
          AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)
          AND p.id_equipo_visitante IS DISTINCT FROM p.id_equipo_local
      ),
      agregado AS (
        SELECT
          pares.id_equipo,
          COUNT(*) FILTER (WHERE pares.estado = 'Finalizado') AS pj,
          COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf > pares.gc) AS pg,
          COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf = pares.gc) AS pe,
          COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf < pares.gc) AS pp,
          COALESCE(SUM(pares.gf) FILTER (WHERE pares.estado = 'Finalizado'), 0) AS gf,
          COALESCE(SUM(pares.gc) FILTER (WHERE pares.estado = 'Finalizado'), 0) AS gc,
          COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf > pares.gc) * 3
            + COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf = pares.gc) AS puntos
        FROM pares
        WHERE pares.id_equipo IN (SELECT id_equipo FROM inscriptos)
        GROUP BY pares.id_equipo
      )
      INSERT INTO posicion (
        id_equipo, id_torneo, id_etapa, pj, pg, pe, pp, gf, gc, puntos
      )
      SELECT
        inscriptos.id_equipo,
        p_id_torneo,
        p_id_etapa,
        COALESCE(agregado.pj, 0),
        COALESCE(agregado.pg, 0),
        COALESCE(agregado.pe, 0),
        COALESCE(agregado.pp, 0),
        COALESCE(agregado.gf, 0),
        COALESCE(agregado.gc, 0),
        COALESCE(agregado.puntos, 0)
      FROM inscriptos
      LEFT JOIN agregado ON agregado.id_equipo = inscriptos.id_equipo
      ON CONFLICT (id_equipo, id_torneo) DO UPDATE SET
        id_etapa        = EXCLUDED.id_etapa,
        pj              = EXCLUDED.pj,
        pg              = EXCLUDED.pg,
        pe              = EXCLUDED.pe,
        pp              = EXCLUDED.pp,
        gf              = EXCLUDED.gf,
        gc              = EXCLUDED.gc,
        puntos          = EXCLUDED.puntos,
        actualizado_en = CURRENT_TIMESTAMP;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP FUNCTION IF EXISTS actualizar_posiciones(INT, INT)');

  if (await knex.schema.hasColumn('posicion', 'id_etapa')) {
    await knex.schema.alterTable('posicion', (table) => {
      table.dropColumn('id_etapa');
    });
  }

  if (await knex.schema.hasColumn('partido', 'id_etapa')) {
    await knex.schema.alterTable('partido', (table) => {
      table.dropColumn('id_etapa');
    });
  }
};
