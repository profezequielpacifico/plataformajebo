const posicionesConPuntosFijos = `COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf > pares.gc) * 3
            + COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf = pares.gc) AS puntos`;

const posicionesConPuntosDeDisciplina = `COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf > pares.gc) * (SELECT puntos_victoria FROM puntos_disciplina)
            + COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf = pares.gc) * (SELECT puntos_empate FROM puntos_disciplina)
            + COUNT(*) FILTER (WHERE pares.estado = 'Finalizado' AND pares.gf < pares.gc) * (SELECT puntos_derrota FROM puntos_disciplina) AS puntos`;

const cteInscriptos = 'WITH inscriptos AS MATERIALIZED (';

const cteConPuntos = `WITH puntos_disciplina AS (
        SELECT d.puntos_victoria, d.puntos_empate, d.puntos_derrota
        FROM torneo t
        JOIN disciplina d ON d.id_disciplina = t.id_disciplina
        WHERE t.id_torneo = p_id_torneo
      ),
      inscriptos AS MATERIALIZED (`;

const obtenerFuncion = async (knex) => {
  const { rows } = await knex.raw(`
    SELECT pg_get_functiondef(oid) AS definicion
    FROM pg_proc
    WHERE proname = 'actualizar_posiciones'
  `);
  return rows[0].definicion;
};

const reemplazarObligatorio = (texto, buscado, nuevo) => {
  if (!texto.includes(buscado)) {
    throw new Error('actualizar_posiciones no tiene la forma esperada');
  }
  return texto.replace(buscado, nuevo);
};

exports.up = async function (knex) {
  await knex.schema.alterTable('disciplina', (t) => {
    t.integer('puntos_victoria').notNullable().defaultTo(2);
    t.integer('puntos_empate').notNullable().defaultTo(1);
    t.integer('puntos_derrota').notNullable().defaultTo(1);
  });
  await knex.raw(`
    ALTER TABLE disciplina ADD CONSTRAINT disciplina_puntos_ck
    CHECK (puntos_victoria >= 0 AND puntos_empate >= 0 AND puntos_derrota >= 0)
  `);

  await knex.schema.alterTable('etapa', (t) => {
    t.string('ambito', 30).notNullable().defaultTo('PERSONALIZADO');
    t.string('origen_tipo', 30).notNullable().defaultTo('INSCRIPCION');
    t.string('origen_ambito', 30);
    t.integer('id_etapa_origen').references('id_etapa').inTable('etapa').onDelete('SET NULL');
    t.integer('clasifican_por_instancia').notNullable().defaultTo(1);
    t.integer('mejores_adicionales').notNullable().defaultTo(0);
    t.integer('territorios_por_instancia');
    t.boolean('avanza_si_unico').notNullable().defaultTo(true);
    t.jsonb('criterios_desempate').notNullable().defaultTo(JSON.stringify(['PUNTOS', 'DIFERENCIA', 'A_FAVOR']));
  });
  await knex.raw(`
    ALTER TABLE etapa
      ADD CONSTRAINT etapa_ambito_ck CHECK (ambito IN ('DISTRITO', 'REGION', 'INTERREGIONAL', 'NACIONAL', 'PERSONALIZADO')),
      ADD CONSTRAINT etapa_origen_tipo_ck CHECK (origen_tipo IN ('INSCRIPCION', 'ETAPA', 'MANUAL')),
      ADD CONSTRAINT etapa_origen_ambito_ck CHECK (origen_ambito IS NULL OR origen_ambito IN ('DISTRITO', 'REGION', 'INTERREGIONAL', 'NACIONAL', 'PERSONALIZADO')),
      ADD CONSTRAINT etapa_clasifican_ck CHECK (clasifican_por_instancia >= 1 AND mejores_adicionales >= 0),
      ADD CONSTRAINT etapa_territorios_ck CHECK (territorios_por_instancia IS NULL OR territorios_por_instancia >= 1),
      ADD CONSTRAINT etapa_origen_distinto_ck CHECK (id_etapa_origen IS NULL OR id_etapa_origen <> id_etapa)
  `);

  await knex.schema.createTable('etapa_instancia', (t) => {
    t.increments('id_etapa_instancia').primary();
    t.integer('id_etapa').notNullable().references('id_etapa').inTable('etapa').onDelete('CASCADE');
    t.string('nombre', 150).notNullable();
    t.string('estado', 20).notNullable().defaultTo('Pendiente');
    t.boolean('encuentros_generados').notNullable().defaultTo(false);
    t.timestamp('creado_en', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    t.unique(['id_etapa', 'nombre']);
  });
  await knex.raw(`
    ALTER TABLE etapa_instancia ADD CONSTRAINT etapa_instancia_estado_ck
    CHECK (estado IN ('Pendiente', 'En Progreso', 'Finalizada'))
  `);

  await knex.schema.createTable('etapa_instancia_territorio', (t) => {
    t.increments('id_territorio').primary();
    t.integer('id_etapa_instancia').notNullable().references('id_etapa_instancia').inTable('etapa_instancia').onDelete('CASCADE');
    t.integer('id_distrito').references('id_distrito').inTable('distrito').onDelete('CASCADE');
    t.integer('id_region').references('id_region').inTable('region').onDelete('CASCADE');
    t.index(['id_etapa_instancia']);
  });
  await knex.raw(`
    ALTER TABLE etapa_instancia_territorio ADD CONSTRAINT etapa_instancia_territorio_uno_ck
    CHECK (num_nonnulls(id_distrito, id_region) = 1)
  `);

  await knex.schema.createTable('instancia_participante', (t) => {
    t.increments('id_instancia_participante').primary();
    t.integer('id_etapa_instancia').notNullable().references('id_etapa_instancia').inTable('etapa_instancia').onDelete('CASCADE');
    t.integer('id_equipo').notNullable().references('id_equipo').inTable('equipo').onDelete('CASCADE');
    t.integer('id_instancia_origen').references('id_etapa_instancia').inTable('etapa_instancia').onDelete('SET NULL');
    t.integer('posicion_origen');
    t.string('motivo', 30).notNullable().defaultTo('INSCRIPCION');
    t.boolean('clasificado').notNullable().defaultTo(false);
    t.string('motivo_clasificacion', 30);
    t.integer('posicion_final');
    t.unique(['id_etapa_instancia', 'id_equipo']);
    t.index(['id_equipo']);
  });
  await knex.raw(`
    ALTER TABLE instancia_participante
      ADD CONSTRAINT instancia_participante_motivo_ck CHECK (motivo IN ('INSCRIPCION', 'CLASIFICADO', 'MANUAL')),
      ADD CONSTRAINT instancia_participante_clasificacion_ck CHECK (motivo_clasificacion IS NULL OR motivo_clasificacion IN ('POSICION', 'MEJOR_ADICIONAL', 'UNICO'))
  `);

  await knex.schema.alterTable('partido', (t) => {
    t.integer('id_etapa_instancia').references('id_etapa_instancia').inTable('etapa_instancia').onDelete('SET NULL');
    t.index(['id_etapa_instancia']);
  });
  await knex.schema.alterTable('presentacion', (t) => {
    t.integer('id_etapa_instancia').references('id_etapa_instancia').inTable('etapa_instancia').onDelete('SET NULL');
    t.index(['id_etapa_instancia']);
  });

  await knex.raw(`
    CREATE VIEW v_posicion_instancia AS
    SELECT
      ip.id_etapa_instancia,
      ip.id_equipo,
      COUNT(r.id_partido) AS pj,
      COUNT(r.id_partido) FILTER (WHERE r.gf > r.gc) AS pg,
      COUNT(r.id_partido) FILTER (WHERE r.gf = r.gc) AS pe,
      COUNT(r.id_partido) FILTER (WHERE r.gf < r.gc) AS pp,
      COALESCE(SUM(r.gf), 0) AS gf,
      COALESCE(SUM(r.gc), 0) AS gc,
      COUNT(r.id_partido) FILTER (WHERE r.gf > r.gc) * d.puntos_victoria
        + COUNT(r.id_partido) FILTER (WHERE r.gf = r.gc) * d.puntos_empate
        + COUNT(r.id_partido) FILTER (WHERE r.gf < r.gc) * d.puntos_derrota AS puntos
    FROM instancia_participante ip
    JOIN etapa_instancia ei ON ei.id_etapa_instancia = ip.id_etapa_instancia
    JOIN etapa et ON et.id_etapa = ei.id_etapa
    JOIN torneo t ON t.id_torneo = et.id_torneo
    JOIN disciplina d ON d.id_disciplina = t.id_disciplina
    LEFT JOIN LATERAL (
      SELECT
        p.id_partido,
        CASE WHEN p.id_equipo_local = ip.id_equipo THEN m.puntos_local ELSE m.puntos_visitante END AS gf,
        CASE WHEN p.id_equipo_local = ip.id_equipo THEN m.puntos_visitante ELSE m.puntos_local END AS gc
      FROM partido p
      JOIN v_marcador_partido m ON m.id_partido = p.id_partido
      WHERE p.id_etapa_instancia = ip.id_etapa_instancia
        AND p.estado = 'Finalizado'
        AND ip.id_equipo IN (p.id_equipo_local, p.id_equipo_visitante)
    ) r ON true
    GROUP BY ip.id_etapa_instancia, ip.id_equipo, d.puntos_victoria, d.puntos_empate, d.puntos_derrota
  `);

  let funcion = await obtenerFuncion(knex);
  funcion = reemplazarObligatorio(funcion, cteInscriptos, cteConPuntos);
  funcion = reemplazarObligatorio(funcion, posicionesConPuntosFijos, posicionesConPuntosDeDisciplina);
  await knex.raw(funcion.replace(/\?/g, '\\?'));
};

exports.down = async function (knex) {
  let funcion = await obtenerFuncion(knex);
  funcion = reemplazarObligatorio(funcion, posicionesConPuntosDeDisciplina, posicionesConPuntosFijos);
  funcion = reemplazarObligatorio(funcion, cteConPuntos, cteInscriptos);
  await knex.raw(funcion.replace(/\?/g, '\\?'));

  await knex.raw('DROP VIEW IF EXISTS v_posicion_instancia');
  await knex.schema.alterTable('presentacion', (t) => t.dropColumn('id_etapa_instancia'));
  await knex.schema.alterTable('partido', (t) => t.dropColumn('id_etapa_instancia'));
  await knex.schema.dropTableIfExists('instancia_participante');
  await knex.schema.dropTableIfExists('etapa_instancia_territorio');
  await knex.schema.dropTableIfExists('etapa_instancia');
  await knex.raw(`
    ALTER TABLE etapa
      DROP CONSTRAINT etapa_ambito_ck,
      DROP CONSTRAINT etapa_origen_tipo_ck,
      DROP CONSTRAINT etapa_origen_ambito_ck,
      DROP CONSTRAINT etapa_clasifican_ck,
      DROP CONSTRAINT etapa_territorios_ck,
      DROP CONSTRAINT etapa_origen_distinto_ck
  `);
  await knex.schema.alterTable('etapa', (t) => {
    t.dropColumn('ambito');
    t.dropColumn('origen_tipo');
    t.dropColumn('origen_ambito');
    t.dropColumn('id_etapa_origen');
    t.dropColumn('clasifican_por_instancia');
    t.dropColumn('mejores_adicionales');
    t.dropColumn('territorios_por_instancia');
    t.dropColumn('avanza_si_unico');
    t.dropColumn('criterios_desempate');
  });
  await knex.raw('ALTER TABLE disciplina DROP CONSTRAINT disciplina_puntos_ck');
  await knex.schema.alterTable('disciplina', (t) => {
    t.dropColumn('puntos_victoria');
    t.dropColumn('puntos_empate');
    t.dropColumn('puntos_derrota');
  });
};
