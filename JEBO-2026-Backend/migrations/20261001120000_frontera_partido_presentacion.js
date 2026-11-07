exports.up = async function up(knex) {
  await knex.schema.alterTable('presentacion', (t) => {
    t.integer('id_etapa').unsigned().nullable()
      .references('id_etapa').inTable('etapa')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');
  });

  await knex.raw('CREATE INDEX presentacion_id_etapa_ix ON presentacion (id_etapa)');

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

  await knex.raw(`
    CREATE TRIGGER partido_requiere_marcador
    BEFORE INSERT OR UPDATE OF id_torneo ON partido
    FOR EACH ROW EXECUTE FUNCTION trg_partido_requiere_marcador();
  `);

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
