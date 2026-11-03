/**
 * Backfill: los partidos ya jugados no tienen eventos, y sin esto el marcador
 * derivado los muestra 0-0.
 *
 * Este es el paso que rompe el torneo si se saltea. Hay 8 partidos finalizados
 * con `goles_local`/`goles_visitante` cargados a mano y CERO eventos. En el
 * momento en que `actualizar_posiciones` lea de la vista de marcador, esos
 * partidos pasan a valer 0-0, y un torneo que estaba 3-5 pasa a contar como
 * 0-0: los dos equipos pierden su goleada y el que gano deja de sumar 3
 * puntos.
 *
 * Por eso va en su propia migracion y NO encadenado con la que crea la tabla:
 * para poder correr el SELECT de verificacion del final y comprobar que el
 * numero de eventos coincide con la suma de goles antes de que nada dependa
 * de el.
 *
 * Que se sinteticen eventos de mas es inocuo: sobrarian para partidos en los que
 * el arbitro registro un gol de mas, y el sistema ya tiene la nocion de que eso
 * pasa. Que falten eventos es lo que destruye el historial.
 * registra un gol de mas. Que falten eventos es lo que destruye el historial.
 *
 * Decisiones:
 *
 * - Se migra todo partido con `resultado_cargado`, no solo los finalizados. Hay
 *   partidos "En Juego" con marcador cargado que, si se dejaran fuera,
 *   aparecerian en 0-0 mientras su `goles_local` dice 3.
 *
 * - `segundos_partido` queda NULL porque no se conoce el momento real del gol.
 *   Inventar un tiempo de partido seria mentir sobre la informacion que el
 *   ledger existe para preservar. La UI muestra "-" para estos eventos.
 *
 * - `hora_real` se toma de `creado_en` del partido: es una aproximacion, pero
 *   es la unica marca temporal disponible y no es peor que no tener ninguna.
 *
 * - `estado` queda CONFIRMADO para que cuenten en el marcador. No hay estado
 *   MIGRADO a proposito: agregaria una rama a cada consulta del sistema para
 *   distinguir un evento real de uno sintetico, a cambio de no ganar nada.
 *
 * - `id_usuario_arbitro` queda NULL cuando el partido no tiene arbitro
 *   asignado. Hay 6 de los 12 partidos con resultado cargado en esa situacion,
 *   y uno de ellos es un Finalizado 3-5 que mueve la tabla de posiciones. No se
 *   sabe quien los arbitro, y la FK compuesta obliga a poner uno. Fabricar
 *   la atribucion para poder migrar seria peor que dejar la incognita
 *   explícita: NULL dice "no sabemos", un arbitro al azar dice "asi lo arbitro
 *   este" y es mentira. La columna es nullable justamente por esto.
 *
 * - La verificacion del final compara el total de eventos generados contra la
 *   suma de goles de los partidos migrados. Cubre TODOS los partidos con
 *   resultado cargado, con arbitro o sin el.
 */
exports.up = async function up(knex) {
  const { rows: sinArbitro } = await knex.raw(`
    SELECT p.id_partido
    FROM partido p
    WHERE p.resultado_cargado = true
      AND NOT EXISTS (SELECT 1 FROM staff_partido sp WHERE sp.id_partido = p.id_partido)
  `);

  if (sinArbitro.length > 0) {
    // eslint-disable-next-line no-console
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

  // Verificacion. No es decorativa: si esto no cierra, el backfill esta mal y
  // las posiciones historicas quedan corruptas en silencio. Se lanza antes de
  // que ninguna vista dependa de la tabla.
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

  // eslint-disable-next-line no-console
  console.log(`[backfill evento_partido] ${verif.generado} evento(s) generado(s), verificado.`);
};

exports.down = async function down(knex) {
  // Solo borra los eventos sintetizados. Los cargados desde la aplicacion
  // tienen `segundos_partido` informado, que es lo que los distingue de los de
  // esta migracion.
  await knex.raw(`
    DELETE FROM evento_partido
    WHERE segundos_partido IS NULL
  `);
};
