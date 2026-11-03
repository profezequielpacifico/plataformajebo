/**
 * Resultado oficial = promedio de las hojas DEL JURADO, no de todas las hojas.
 *
 * `guardarHoja` ahora deja que un administrador que no figura en `staff_presentacion`
 * cargue su propia hoja, para que quien organiza la jornada pueda asentar los puntos
 * sin esperar a que cada juez entre a cargarlos. Esa hoja es una cuarta hoja más, no
 * una de las tres del jurado.
 *
 * Sin este filtro el promedio oficial se corría solo: `por_juez` promediaba TODAS las
 * filas de `evaluacion`, así que la hoja del admin contaba como un juez más
 * (`jueces_count` daba 4) y desplazaba el puntaje de cada equipo sin que nadie lo
 * hubiera pedido. El corte va en `por_juez`, o sea antes de los promedios, para que
 * `puntaje_promedio`, `coord_promedio`, los desempates y `jueces_count` sigan
 * reflejando exactamente lo que decidió el jurado.
 *
 * La segunda mitad del `WHERE` (presentaciones sin ninguna fila en
 * `staff_presentacion`) es para los datos que se cargaron por SQL sin armar el
 * jurado, que es como quedaron varias presentaciones de demo en la base de
 * desarrollo: tienen hojas de tres jueces y ningún registro de panel. Con el filtro
 * estricto esas presentaciones perdían el resultado de la vista por completo. Sin
 * panel no hay hoja que sea "de más", así que ahí se cuenta todo, igual que antes de
 * esta migración. Y no abre la puerta a que la hoja de un admin cuente: una
 * presentación sin jurado tampoco puede cerrarse, porque `validarCierre` exige tres
 * jueces en el staff.
 *
 * `validarCierre` ya recorria `staff_presentacion` para exigir una hoja por juez, así
 * que nunca vio la fila del admin y no necesitó cambios.
 */
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