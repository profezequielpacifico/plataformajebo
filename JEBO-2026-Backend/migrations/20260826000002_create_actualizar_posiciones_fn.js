/**
 * Crea la función almacenada actualizar_posiciones(id_torneo, id_etapa).
 * Recalcula la tabla posicion a partir de los partidos finalizados.
 * Usada en posicion.repository.js → recalcular()
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION actualizar_posiciones(p_id_torneo INT, p_id_etapa INT)
    RETURNS VOID AS $$
    BEGIN
      DELETE FROM posicion
      WHERE id_torneo = p_id_torneo
        AND (p_id_etapa IS NULL OR id_etapa = p_id_etapa);

      INSERT INTO posicion (id_equipo, id_torneo, id_etapa, pj, pg, pe, pp, gf, gc, puntos)
      SELECT
        eq.id_equipo,
        p_id_torneo,
        p_id_etapa,
        COUNT(*) FILTER (WHERE p.estado = 'Finalizado') AS pj,
        COUNT(*) FILTER (WHERE p.estado = 'Finalizado' AND
          ((p.id_equipo_local = eq.id_equipo AND p.goles_local > p.goles_visitante) OR
           (p.id_equipo_visitante = eq.id_equipo AND p.goles_visitante > p.goles_local))) AS pg,
        COUNT(*) FILTER (WHERE p.estado = 'Finalizado' AND p.goles_local = p.goles_visitante) AS pe,
        COUNT(*) FILTER (WHERE p.estado = 'Finalizado' AND
          ((p.id_equipo_local = eq.id_equipo AND p.goles_local < p.goles_visitante) OR
           (p.id_equipo_visitante = eq.id_equipo AND p.goles_visitante < p.goles_local))) AS pp,
        COALESCE(SUM(
          CASE WHEN p.id_equipo_local = eq.id_equipo THEN p.goles_local
               WHEN p.id_equipo_visitante = eq.id_equipo THEN p.goles_visitante
               ELSE 0 END
        ), 0) AS gf,
        COALESCE(SUM(
          CASE WHEN p.id_equipo_local = eq.id_equipo THEN p.goles_visitante
               WHEN p.id_equipo_visitante = eq.id_equipo THEN p.goles_local
               ELSE 0 END
        ), 0) AS gc,
        (COUNT(*) FILTER (WHERE p.estado = 'Finalizado' AND
          ((p.id_equipo_local = eq.id_equipo AND p.goles_local > p.goles_visitante) OR
           (p.id_equipo_visitante = eq.id_equipo AND p.goles_visitante > p.goles_local))) * 3 +
         COUNT(*) FILTER (WHERE p.estado = 'Finalizado' AND p.goles_local = p.goles_visitante)) AS puntos
      FROM equipo eq
      INNER JOIN posicion existing ON existing.id_equipo = eq.id_equipo AND existing.id_torneo = p_id_torneo
      LEFT JOIN partido p ON p.id_torneo = p_id_torneo
        AND (p_id_etapa IS NULL OR p.id_etapa = p_id_etapa)
        AND (p.id_equipo_local = eq.id_equipo OR p.id_equipo_visitante = eq.id_equipo)
      GROUP BY eq.id_equipo;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw('DROP FUNCTION IF EXISTS actualizar_posiciones(INT, INT)');
};
