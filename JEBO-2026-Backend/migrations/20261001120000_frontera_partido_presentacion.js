/**
 * Frontera de dominio entre "partido" y "encuentro" (JEBO 2026).
 *
 * Gimnasia Artística no tiene partidos: tiene encuentros donde un solo equipo
 * se presenta por vez y es evaluado por un jurado. El modelo de tablas ya lo
 * refleja — `presentacion` + `presentacion_participante` con `orden_salida` + la
 * hoja `evaluacion` — pero el resto del sistema no lo respetaba:
 *
 *   1. `partido` acepta cualquier torneo. Con dos equipos inscriptos, el
 *      generador de fixture armaba un round-robin de local/visitante para un
 *      torneo de Gimnasia, que es exactamente el modelo que la disciplina no
 *      tiene.
 *   2. `presentacion` y `partido` podían existir en el mismo torneo a la vez,
 *      con dos verdades distintas sobre cómo se compite.
 *
 * Esto no se resuelve con un CHECK: un CHECK de Postgres solo puede mirar
 * columnas de la misma fila, y la reglas cruza tres tablas
 * (`partido` → `torneo` → `disciplina`). Por eso van triggers.
 *
 * Los triggers son la RED DE SEGURIDAD, no la validación principal: dan un
 * error de SQL opaco. El mensaje en castellano que el usuario ve viene del
 * guard de `partido.service.create` y de `fixture.service.generate`, que corren
 * antes. Los triggers existen para que un script, un seed o una corrección
 * manual contra la base no puedan meter un partido en un torneo de Gimnasia.
 */
exports.up = async function up(knex) {
  // 1) `presentacion` se integra a las etapas del torneo.
  //
  // `partido` ya tenía `id_etapa` (ON DELETE SET NULL) y las presentaciones no.
  // Sin esta columna, las etapas que define el formulario de torneo no le
  // topeban nada al módulo de Gimnasia y no había forma de agrupar encuentros
  // por etapa. La política de borrado copia la de `partido`: si se borra una
  // etapa, las presentaciones quedan sin etapa en vez de desaparecer.
  await knex.schema.alterTable('presentacion', (t) => {
    t.integer('id_etapa').unsigned().nullable()
      .references('id_etapa').inTable('etapa')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });

  await knex.raw('CREATE INDEX presentacion_id_etapa_ix ON presentacion (id_etapa)');

  // 2) Trigger: un `partido` solo en torneos de tipo MARCADOR.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION trg_partido_requiere_marcador()
    RETURNS TRIGGER AS $$
    DECLARE
      v_torneo TEXT;
      v_tipo   TEXT;
    BEGIN
      SELECT t.nombre, d.tipo_competencia
        INTO v_torneo, v_tipo
        FROM torneo t
        JOIN disciplina d ON d.id_disciplina = t.id_disciplina
       WHERE t.id_torneo = NEW.id_torneo;

      -- Sin torneo no hay nada que decidir: lo rechaza la FK de partido.
      IF v_tipo IS NULL THEN
        RETURN NEW;
      END IF;

      IF v_tipo = 'EVALUACION' THEN
        RAISE EXCEPTION
          'El torneo "%" es de tipo EVALUACION: no admite partidos, los encuentros se cargan como presentaciones',
          v_torneo
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // BEFORE INSERT y `UPDATE OF id_torneo`: si el torneo no cambia, un UPDATE
  // posterior (cargar el marcador, cambiar el estado) no tiene por qué volver a
  // pasar por acá.
  await knex.raw(`
    CREATE TRIGGER partido_requiere_marcador
    BEFORE INSERT OR UPDATE OF id_torneo ON partido
    FOR EACH ROW EXECUTE FUNCTION trg_partido_requiere_marcador();
  `);

  // 3) Trigger: una `presentacion` solo en torneos de tipo EVALUACION.
  //
  // El inverso del anterior. `presentacion.service.create` ya lo valida con un
  // mensaje claro; acá se cierra el otro lado, que era el que quedaba abierto.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION trg_presentacion_requiere_evaluacion()
    RETURNS TRIGGER AS $$
    DECLARE
      v_torneo TEXT;
      v_tipo   TEXT;
    BEGIN
      SELECT t.nombre, d.tipo_competencia
        INTO v_torneo, v_tipo
        FROM torneo t
        JOIN disciplina d ON d.id_disciplina = t.id_disciplina
       WHERE t.id_torneo = NEW.id_torneo;

      IF v_tipo IS NULL THEN
        RETURN NEW;
      END IF;

      IF v_tipo = 'MARCADOR' THEN
        RAISE EXCEPTION
          'El torneo "%" es de tipo MARCADOR: sus encuentros son partidos, no presentaciones',
          v_torneo
          USING ERRCODE = 'check_violation';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER presentacion_requiere_evaluacion
    BEFORE INSERT OR UPDATE OF id_torneo ON presentacion
    FOR EACH ROW EXECUTE FUNCTION trg_presentacion_requiere_evaluacion();
  `);
};

exports.down = async function down(knex) {
  await knex.raw('DROP TRIGGER IF EXISTS presentacion_requiere_evaluacion ON presentacion');
  await knex.raw('DROP FUNCTION IF EXISTS trg_presentacion_requiere_evaluacion()');
  await knex.raw('DROP TRIGGER IF EXISTS partido_requiere_marcador ON partido');
  await knex.raw('DROP FUNCTION IF EXISTS trg_partido_requiere_marcador()');
  await knex.raw('DROP INDEX IF EXISTS presentacion_id_etapa_ix');
  await knex.schema.alterTable('presentacion', (t) => {
    t.dropColumn('id_etapa');
  });
};
