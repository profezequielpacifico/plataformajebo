exports.up = async function up(knex) {
  const { rows:affected } = await knex.raw(`
    SELECT DISTINCT p.id_torneo
      FROM presentacion p
      JOIN presentacion_participante pp ON pp.id_presentacion = p.id_presentacion
     GROUP BY p.id_torneo, p.id_presentacion
    HAVING count(*) > 1
  `);

  if (affected.length > 0) {
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

};
