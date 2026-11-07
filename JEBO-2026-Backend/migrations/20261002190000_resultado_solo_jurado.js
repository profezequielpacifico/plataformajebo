const VISTA_RESULTADO = (filtro) => `
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
    FROM evaluacion e${filtro}
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
`;

const SOLO_JURADO = `
    WHERE EXISTS (
      SELECT 1 FROM staff_presentacion sp
      WHERE sp.id_presentacion = e.id_presentacion
        AND sp.id_usuario = e.id_juez
        AND sp.rol IN ('JUEZ_PRESIDENTE', 'JUEZ')
    )
    OR NOT EXISTS (
      SELECT 1 FROM staff_presentacion sp
      WHERE sp.id_presentacion = e.id_presentacion
    )`;

exports.up = async function up(knex) {
  await knex.raw(VISTA_RESULTADO(SOLO_JURADO));
};

exports.down = async function down(knex) {
  await knex.raw(VISTA_RESULTADO(''));
};