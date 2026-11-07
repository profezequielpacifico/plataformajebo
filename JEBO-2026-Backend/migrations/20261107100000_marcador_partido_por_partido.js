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

const VISTA_AGREGADA = `
  CREATE OR REPLACE VIEW v_marcador_partido AS
  SELECT p.id_partido,
         p.id_equipo_local,
         p.id_equipo_visitante,
         COALESCE(ml.n, 0::bigint) AS puntos_local,
         COALESCE(mv.n, 0::bigint) AS puntos_visitante
    FROM partido p
    LEFT JOIN (SELECT id_partido, id_equipo, count(*) AS n FROM evento_partido
                WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
                GROUP BY id_partido, id_equipo) ml
      ON ml.id_partido = p.id_partido AND ml.id_equipo = p.id_equipo_local
    LEFT JOIN (SELECT id_partido, id_equipo, count(*) AS n FROM evento_partido
                WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
                GROUP BY id_partido, id_equipo) mv
      ON mv.id_partido = p.id_partido AND mv.id_equipo = p.id_equipo_visitante`;

exports.up = (knex) => knex.raw(VISTA_POR_PARTIDO);
exports.down = (knex) => knex.raw(VISTA_AGREGADA);
