/**
 * `v_marcador_partido`: el marcador derivado del ledger, y
 * `actualizar_posiciones` deja de leer `partido.goles_*`.
 *
 * El marcador era un par de contadores en `partido` que el arbitro escribia a
 * mano. A partir de aca es un COUNT sobre los eventos CONFIRMADOS, y eso
 * significa que un evento anulado se descuenta solo, sin ningun paso extra.
 *
 * La regla de negocio queda escrita UNA vez, en la base. Si la regra viviera en
 * el servicio, cada consulta nueva del marcador (el listado, la pantalla en
 * vivo, las posiciones, un reporte futuro) seria el lugar donde alguien la
 * reimplementa mal.
 *
 * `actualizar_posiciones` sigue contando solo partidos `Finalizado`: el
 * `FILTER` sobre `pares.estado` no se toca, asi que un partido en curso sigue
 * sin puntuar hasta que se cierra.
 */
exports.up = async function up(knex) {
  // Dos self-LEFT JOIN, uno por lado, porque `m` viene agregado por
  // (partido, equipo) y cada lado del partido necesita SU conteo. Un solo JOIN
  // con `puntos_local = puntos_visitante` seria el error clasico: daria el
  // mismo numero a los dos equipos.
  await knex.raw(`
    CREATE OR REPLACE VIEW v_marcador_partido AS
    SELECT
      p.id_partido,
      p.id_equipo_local,
      p.id_equipo_visitante,
      COALESCE(ml.n, 0) AS puntos_local,
      COALESCE(mv.n, 0) AS puntos_visitante
    FROM partido p
    LEFT JOIN (
      SELECT id_partido, id_equipo, count(*) AS n
      FROM evento_partido
      WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
      GROUP BY id_partido, id_equipo
    ) ml ON ml.id_partido = p.id_partido AND ml.id_equipo = p.id_equipo_local
    LEFT JOIN (
      SELECT id_partido, id_equipo, count(*) AS n
      FROM evento_partido
      WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
      GROUP BY id_partido, id_equipo
    ) mv ON mv.id_partido = p.id_partido AND mv.id_equipo = p.id_equipo_visitante
  `);

  // Upsert de las posiciones leyendo el marcador derivado.
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
          p.id_equipo_local    AS id_equipo,
          m.puntos_local       AS gf,
          m.puntos_visitante   AS gc,
          p.estado
        FROM partido p
        JOIN v_marcador_partido m ON m.id_partido = p.id_partido
        WHERE p.id_torneo = p_id_torneo
          AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)

        UNION ALL

        SELECT
          p.id_partido,
          p.id_equipo_visitante AS id_equipo,
          m.puntos_visitante    AS gf,
          m.puntos_local        AS gc,
          p.estado
        FROM partido p
        JOIN v_marcador_partido m ON m.id_partido = p.id_partido
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
  // Vuelve a leer `partido.goles_*`. Las columnas no se dropean: siguen siendo
  // la foto congelada del resultado y las leen reportes viejos. Lo que se
  // revierte es de donde sale el marcador para el calculo de posiciones.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION actualizar_posiciones(p_id_torneo INT, p_id_etapa INT)
    RETURNS VOID AS $$
    BEGIN
      IF p_id_torneo IS NULL THEN
        RETURN;
      END IF;

      WITH inscriptos AS MATERIALIZED (
        SELECT id_equipo FROM posicion WHERE id_torneo = p_id_torneo
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
        inscriptos.id_equipo, p_id_torneo, p_id_etapa,
        COALESCE(agregado.pj, 0), COALESCE(agregado.pg, 0), COALESCE(agregado.pe, 0),
        COALESCE(agregado.pp, 0), COALESCE(agregado.gf, 0), COALESCE(agregado.gc, 0),
        COALESCE(agregado.puntos, 0)
      FROM inscriptos
      LEFT JOIN agregado ON agregado.id_equipo = inscriptos.id_equipo
      ON CONFLICT (id_equipo, id_torneo) DO UPDATE SET
        id_etapa = EXCLUDED.id_etapa, pj = EXCLUDED.pj, pg = EXCLUDED.pg,
        pe = EXCLUDED.pe, pp = EXCLUDED.pp, gf = EXCLUDED.gf, gc = EXCLUDED.gc,
        puntos = EXCLUDED.puntos, actualizado_en = CURRENT_TIMESTAMP;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw('DROP VIEW IF EXISTS v_marcador_partido');
};
