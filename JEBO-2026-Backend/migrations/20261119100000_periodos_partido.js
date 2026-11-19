const NOMBRE_NORMALIZADO = "translate(lower(nombre), 'áéíóú', 'aeiou')";

const VISTA_POR_PARTIDO = `
  CREATE OR REPLACE VIEW v_marcador_partido AS
  SELECT p.id_partido,
         p.id_equipo_local,
         p.id_equipo_visitante,
         (SELECT count(*) FROM evento_partido e
           WHERE e.id_partido = p.id_partido AND e.id_equipo = p.id_equipo_local
             AND e.estado = 'CONFIRMADO' AND e.tipo_evento = 'ANOTACION') AS puntos_local,
         (SELECT count(*) FROM evento_partido e
           WHERE e.id_partido = p.id_partido AND e.id_equipo = p.id_equipo_visitante
             AND e.estado = 'CONFIRMADO' AND e.tipo_evento = 'ANOTACION') AS puntos_visitante
    FROM partido p`;

const marcadorDe = (columnaEquipo) => `
         CASE WHEN EXISTS (SELECT 1 FROM partido_periodo pp WHERE pp.id_partido = p.id_partido)
           THEN (SELECT count(*) FROM partido_periodo pp
                  WHERE pp.id_partido = p.id_partido AND pp.estado = 'CERRADO'
                    AND pp.id_equipo_ganador = p.${columnaEquipo})
           ELSE (SELECT count(*) FROM evento_partido e
                  WHERE e.id_partido = p.id_partido AND e.id_equipo = p.${columnaEquipo}
                    AND e.estado = 'CONFIRMADO' AND e.tipo_evento = 'ANOTACION')
         END`;

const VISTA_CON_PERIODOS = `
  CREATE OR REPLACE VIEW v_marcador_partido AS
  SELECT p.id_partido,
         p.id_equipo_local,
         p.id_equipo_visitante,
         ${marcadorDe('id_equipo_local')} AS puntos_local,
         ${marcadorDe('id_equipo_visitante')} AS puntos_visitante
    FROM partido p`;

const VISTA_PUNTOS_PERIODO = `
  CREATE VIEW v_puntos_periodo_partido AS
  SELECT pp.id_partido,
         COALESCE(SUM(pp.puntos_local), 0)::bigint AS puntos_local,
         COALESCE(SUM(pp.puntos_visitante), 0)::bigint AS puntos_visitante
    FROM partido_periodo pp
   WHERE pp.estado = 'CERRADO'
   GROUP BY pp.id_partido`;

exports.up = async (knex) => {
  await knex.schema.alterTable('disciplina', (t) => {
    t.boolean('marcador_por_periodos').notNullable().defaultTo(false);
    t.string('nombre_periodo', 20);
    t.smallint('max_periodos');
  });

  await knex.raw(`
    UPDATE disciplina
       SET marcador_por_periodos = true,
           max_periodos = 3,
           nombre_periodo = CASE WHEN ${NOMBRE_NORMALIZADO} LIKE '%ringo%' THEN 'Período' ELSE 'Set' END
     WHERE ${NOMBRE_NORMALIZADO} ~ '(voley|voleibol|ringo)'
  `);

  await knex.schema.createTable('partido_periodo', (t) => {
    t.increments('id_partido_periodo').primary();
    t.integer('id_partido').notNullable().references('id_partido').inTable('partido').onDelete('CASCADE');
    t.smallint('numero').notNullable();
    t.string('estado', 20).notNullable().defaultTo('EN_JUEGO');
    t.integer('puntos_local').notNullable().defaultTo(0);
    t.integer('puntos_visitante').notNullable().defaultTo(0);
    t.integer('id_equipo_ganador').references('id_equipo').inTable('equipo');
    t.integer('cerrado_por').references('id_usuario').inTable('usuario').onDelete('SET NULL');
    t.timestamp('cerrado_en');
    t.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
    t.unique(['id_partido', 'numero']);
  });
  await knex.raw(`
    ALTER TABLE partido_periodo
      ADD CONSTRAINT partido_periodo_estado_ck CHECK (estado IN ('EN_JUEGO', 'CERRADO')),
      ADD CONSTRAINT partido_periodo_numero_ck CHECK (numero BETWEEN 1 AND 3)
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX partido_periodo_en_juego_ux
      ON partido_periodo (id_partido) WHERE estado = 'EN_JUEGO'
  `);

  await knex.schema.alterTable('evento_partido', (t) => {
    t.smallint('numero_periodo');
  });

  await knex.raw(VISTA_CON_PERIODOS);
  await knex.raw(VISTA_PUNTOS_PERIODO);
};

exports.down = async (knex) => {
  await knex.raw('DROP VIEW IF EXISTS v_puntos_periodo_partido');
  await knex.raw(VISTA_POR_PARTIDO);
  await knex.schema.alterTable('evento_partido', (t) => {
    t.dropColumn('numero_periodo');
  });
  await knex.schema.dropTableIfExists('partido_periodo');
  await knex.schema.alterTable('disciplina', (t) => {
    t.dropColumn('marcador_por_periodos');
    t.dropColumn('nombre_periodo');
    t.dropColumn('max_periodos');
  });
};
