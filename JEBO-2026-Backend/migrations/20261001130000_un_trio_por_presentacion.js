/**
 * Una presentación es de UN SOLO trío (JEBO 2026).
 *
 * `presentacion` + `presentacion_participante` se venía usando como si una
 * presentación fuera una ronda en la que se presentaban varios tríos juntos: la
 * fila decía "4 tríos" y la hoja de evaluación traía los cuatro en la misma
 * grilla. Gimnasia Artística no juega eso. Cada encuentro es de un trío, que
 * sale solo, se lo evalúa y termina. No hay a qué comparar dentro de la
 * presentación, así que la grilla mezclaba tríos que nunca se enfrentaron y el
 * ranking de esa pantalla no significaba nada.
 *
 * La regla no cabe en el `CHECK` de `presentacion_participante`: un CHECK solo
 * mira su propia fila, y lo que se quiere limitar es cuántas filas hay por
 * `id_presentacion`. Por eso va un trigger BEFORE INSERT, más un CHECK sobre
 * `orden_salida`, que a partir de ahora solo puede valer 1.
 *
 * Igual que en la frontera partido/presentación, el trigger es la RED DE
 * SEGURIDAD. El mensaje en castellano que ve el usuario sale del guard de
 * `presentacion.service.create` y `presentacion.service.update`, que corren
 * antes. El trigger existe para que un seed o una corrección manual por SQL no
 * puedan volver a meter dos tríos en un encuentro.
 */
exports.up = async function up(knex) {
  // Torneos con alguna presentación de más de un trío. Se los consulta antes de
  // tocar nada, porque después de partir ya no hay forma de reconocer cuáles
  //rainian una presentación partida de una que siempre tuvo un solo trío.
  const { rows:affected } = await knex.raw(`
    SELECT DISTINCT p.id_torneo
      FROM presentacion p
      JOIN presentacion_participante pp ON pp.id_presentacion = p.id_presentacion
     GROUP BY p.id_torneo, p.id_presentacion
    HAVING count(*) > 1
  `);

  if (affected.length > 0) {
    // 1) Partir cada presentación con N tríos en N encuentros de uno.
    //
    // Por cada participante que no es el primero por orden de salida:
    //   - se inserta en una presentación nueva, que es un encuentro propio;
    //   - se le mueve la evaluación a esa presentación;
    //   - recién entonces se lo borra de la vieja.
    //
    // El orden importa: la FK de `evaluacion` hacia `presentacion_participante`
    // es ON DELETE CASCADE pero no ON UPDATE. Si se borrara la fila vieja
    // primero, el cascada se llevaría las notas que los jueces ya habían
    // cargado.
    await knex.raw(`
      DO $$
      DECLARE
        v_extra  JSONB;
        v_item   JSONB;
        v_nuevo  INT;
        v_orden  INT;
        v_id     INT;
        v_equipo INT;
        v_torneo INT;
      BEGIN
        -- Se lee el lote entero a una variable antes de modificar nada: el
        -- bucle inserta en la misma tabla que se está recorriendo, y un cursor
        -- abierto la vería mutar bajo los pies.
        SELECT coalesce(
                 jsonb_agg(
                   jsonb_build_object(
                     'origen', pp.id_presentacion,
                     'equipo', pp.id_equipo,
                     'rol', pp.rol
                   )
                   ORDER BY pp.id_presentacion, pp.orden_salida
                 ), '[]'::jsonb
               )
          INTO v_extra
          FROM presentacion_participante pp
          JOIN (
            SELECT id_presentacion, min(orden_salida) AS primero
              FROM presentacion_participante
             GROUP BY id_presentacion
          ) x ON x.id_presentacion = pp.id_presentacion
         WHERE pp.orden_salida > x.primero;

        FOR v_item IN SELECT * FROM jsonb_array_elements(v_extra) LOOP
          v_id     := (v_item->>'origen')::int;
          v_equipo := (v_item->>'equipo')::int;

          SELECT id_torneo INTO v_torneo FROM presentacion WHERE id_presentacion = v_id;

          -- El encuentro nuevo va al final del torneo con el siguiente orden
          -- libre; el orden de salida de verdad se asigna en el paso 2.
          SELECT coalesce(max(orden), 0) + 1 INTO v_orden
            FROM presentacion WHERE id_torneo = v_torneo;

          INSERT INTO presentacion (id_torneo, id_disciplina, orden, estado, fecha_hora, id_disponibilidad, id_etapa)
          SELECT id_torneo, id_disciplina, v_orden, estado, fecha_hora, id_disponibilidad, id_etapa
            FROM presentacion WHERE id_presentacion = v_id
          RETURNING id_presentacion INTO v_nuevo;

          INSERT INTO presentacion_participante (id_presentacion, id_equipo, rol, orden_salida)
          VALUES (v_nuevo, v_equipo, v_item->>'rol', 1);

          UPDATE evaluacion
             SET id_presentacion = v_nuevo
           WHERE id_presentacion = v_id AND id_participante_equipo = v_equipo;

          DELETE FROM presentacion_participante
           WHERE id_presentacion = v_id AND id_equipo = v_equipo;
        END LOOP;
      END;
      $$;
    `);

    // 2) Renumerar el orden de salida de esos torneos.
    //
    // Los encuentros nuevos quedaron con órdenes correlativos al final, pero el
    // orden que manda es el de la disciplina: primero el trío que abría la
    // presentación, después el segundo, y así. El `mod 100000` desarma el
    // corrimiento del paso intermedio de este mismo bloque.
    //
    // Va en dos UPDATE porque `(id_torneo, orden)` es UNIQUE: renumerar de una
    // sola pasada chocaría con la fila que ya ocupa el orden de destino.
    const torneos = affected.map(r => r.id_torneo);

    await knex.raw(`
      UPDATE presentacion SET orden = orden + 100000 WHERE id_torneo = ANY(?)
    `, [torneos]);

    await knex.raw(`
      UPDATE presentacion p
         SET orden = n.nuevo
        FROM (
          SELECT p2.id_presentacion,
                 row_number() OVER (
                   PARTITION BY p2.id_torneo
                   ORDER BY p2.orden % 100000, coalesce(pp2.orden_salida, 1), pp2.id_equipo
                 )::int AS nuevo
            FROM presentacion p2
            LEFT JOIN presentacion_participante pp2 ON pp2.id_presentacion = p2.id_presentacion
           WHERE p2.id_torneo = ANY(?)
        ) n
       WHERE p.id_presentacion = n.id_presentacion
    `, [torneos]);
  }

  // 3) Trigger: no se puede agregar un segundo trío a una presentación.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION trg_presentacion_un_solo_trio()
    RETURNS TRIGGER AS $$
    DECLARE
      v_torneo TEXT;
      v_actual TEXT;
    BEGIN
      SELECT t.nombre, e.nombre
        INTO v_torneo, v_actual
        FROM presentacion_participante pp
        JOIN presentacion p ON p.id_presentacion = pp.id_presentacion
        JOIN torneo t ON t.id_torneo = p.id_torneo
        JOIN equipo e ON e.id_equipo = pp.id_equipo
       WHERE pp.id_presentacion = NEW.id_presentacion
       LIMIT 1;

      IF v_actual IS NOT NULL THEN
        RAISE EXCEPTION
          'La presentacion ya tiene al trio "%". Cada encuentro es de un solo trio: cargalo en otra presentacion del torneo "%"',
          v_actual, v_torneo
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER presentacion_un_solo_trio
    BEFORE INSERT ON presentacion_participante
    FOR EACH ROW EXECUTE FUNCTION trg_presentacion_un_solo_trio();
  `);

  // 4) `orden_salida` siempre 1: con un solo trío no hay a qué ordenar. Dejar
  // la columna libre hacía que un INSERT directo metiera valores que la
  // aplicación leía después como "orden de salida" sin serlo.
  await knex.raw(`
    ALTER TABLE presentacion_participante
      ADD CONSTRAINT presentacion_participante_orden_salida_unico
      CHECK (orden_salida = 1)
  `);
};

exports.down = async function down(knex) {
  await knex.raw(
    'ALTER TABLE presentacion_participante DROP CONSTRAINT IF EXISTS presentacion_participante_orden_salida_unico'
  );
  await knex.raw('DROP TRIGGER IF EXISTS presentacion_un_solo_trio ON presentacion_participante');
  await knex.raw('DROP FUNCTION IF EXISTS trg_presentacion_un_solo_trio()');

  // La partición de datos NO se revierte. Juntar de nuevo N encuentros en una
  // sola presentación significa inventar la fecha y el orden de salida que
  // tenía cada trío antes de la partición, que es información que la base ya
  // no tiene. Se baja la restricción y el estado queda partido.
};
