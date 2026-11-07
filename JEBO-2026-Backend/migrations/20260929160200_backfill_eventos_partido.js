exports.up = async function up(knex) {
  const { rows: sinArbitro } = await knex.raw(`
    SELECT p.id_partido
    FROM partido p
    WHERE p.resultado_cargado = true
      AND NOT EXISTS (SELECT 1 FROM staff_partido sp WHERE sp.id_partido = p.id_partido)
  `);

  if (sinArbitro.length > 0) {
    console.warn(
      `[backfill evento_partido] ${sinArbitro.length} partido(s) con resultado cargado ` +
      `sin arbitro asignado: sus eventos quedan con id_usuario_arbitro NULL. ` +
      `Partidos: ${sinArbitro.map((r) => r.id_partido).join(', ')}`
    );
  }

  await knex.raw(`
    INSERT INTO evento_partido (
      id_partido,
      numero_evento,
      tipo_evento,
      id_equipo,
      id_usuario_arbitro,
      registrado_por,
      segundos_partido,
      hora_real,
      estado,
      creado_en
    )
    SELECT
      base.id_partido,
      base.n,
      'ANOTACION',
      base.id_equipo,
      base.id_usuario_arbitro,
      base.id_usuario_arbitro,
      NULL,
      base.creado_en,
      'CONFIRMADO',
      base.creado_en
    FROM (
      SELECT
        p.id_partido,
        p.id_equipo_local  AS id_equipo,
        g.n                 AS n,
        arbitro.id_usuario  AS id_usuario_arbitro,
        p.creado_en,
        1                   AS lado
      FROM partido p
      CROSS JOIN LATERAL generate_series(1, COALESCE(p.goles_local, 0)) AS g(n)
      LEFT JOIN LATERAL (
        SELECT sp.id_usuario FROM staff_partido sp
        WHERE sp.id_partido = p.id_partido
        ORDER BY sp.id_partido_usuario
        LIMIT 1
      ) AS arbitro ON true
      WHERE p.resultado_cargado = true

      UNION ALL

      SELECT
        p.id_partido,
        p.id_equipo_visitante AS id_equipo,
        COALESCE(p.goles_local, 0) + g.n AS n,
        arbitro.id_usuario     AS id_usuario_arbitro,
        p.creado_en,
        2                        AS lado
      FROM partido p
      CROSS JOIN LATERAL generate_series(1, COALESCE(p.goles_visitante, 0)) AS g(n)
      LEFT JOIN LATERAL (
        SELECT sp.id_usuario FROM staff_partido sp
        WHERE sp.id_partido = p.id_partido
        ORDER BY sp.id_partido_usuario
        LIMIT 1
      ) AS arbitro ON true
      WHERE p.resultado_cargado = true
    ) AS base
    ORDER BY base.id_partido, base.lado, base.n
    ON CONFLICT (id_partido, numero_evento) DO NOTHING
  `);

  const { rows: [verif] } = await knex.raw(`
    WITH esperado AS (
      SELECT
        p.id_partido,
        COALESCE(p.goles_local, 0) + COALESCE(p.goles_visitante, 0) AS eventos
      FROM partido p
      WHERE p.resultado_cargado = true
    ),
    real AS (
      SELECT id_partido, count(*) AS eventos
      FROM evento_partido
      GROUP BY id_partido
    )
    SELECT
      COALESCE(SUM(esperado.eventos), 0) AS esperado,
      COALESCE(SUM(real.eventos), 0)    AS generado,
      count(*) FILTER (WHERE COALESCE(real.eventos, 0) <> esperado.eventos) AS partidos_descuadrados
    FROM esperado
    FULL OUTER JOIN real ON real.id_partido = esperado.id_partido
  `);

  if (Number(verif.generado) !== Number(verif.esperado) || Number(verif.partidos_descuadrados) !== 0) {
    throw new Error(
      'Backfill de evento_partido descuadrado: se esperaban ' + verif.esperado +
      ' eventos y se generaron ' + verif.generado + ', con ' +
      verif.partidos_descuadrados + ' partido(s) con conteo distinto al marcador. ' +
      'No se sigue con la migracion.'
    );
  }

  console.log(`[backfill evento_partido] ${verif.generado} evento(s) generado(s), verificado.`);
};

exports.down = async function down(knex) {
  await knex.raw(`
    DELETE FROM evento_partido
    WHERE segundos_partido IS NULL
  `);
};
