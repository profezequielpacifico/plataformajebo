/**
 * Crea la vista v_estadisticas_torneo con estadísticas agregadas por torneo.
 * Usada en estadistica.repository.js → GET /statistics/tournaments/:id
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE OR REPLACE VIEW v_estadisticas_torneo AS
    SELECT
      t.id_torneo,
      t.nombre AS torneo_nombre,
      t.estado AS torneo_estado,
      COUNT(DISTINCT p.id_partido) AS total_partidos,
      COUNT(DISTINCT CASE WHEN p.estado = 'Finalizado' THEN p.id_partido END) AS partidos_jugados,
      COUNT(DISTINCT pos.id_equipo) AS total_equipos,
      COALESCE(SUM(p.goles_local + p.goles_visitante), 0) AS total_goles,
      CASE WHEN COUNT(DISTINCT CASE WHEN p.estado = 'Finalizado' THEN p.id_partido END) > 0
        THEN ROUND(
          SUM(p.goles_local + p.goles_visitante)::numeric /
          COUNT(DISTINCT CASE WHEN p.estado = 'Finalizado' THEN p.id_partido END), 2)
        ELSE 0
      END AS promedio_goles
    FROM torneo t
    LEFT JOIN partido p ON p.id_torneo = t.id_torneo
    LEFT JOIN posicion pos ON pos.id_torneo = t.id_torneo
    GROUP BY t.id_torneo, t.nombre, t.estado;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw('DROP VIEW IF EXISTS v_estadisticas_torneo');
};
