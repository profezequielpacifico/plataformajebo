/**
 * Eliminación en cascada de equipos.
 *
 * Al eliminar un equipo, se eliminan también en cascada sus registros
 * dependientes:
 *  - posicion      (inscripciones del equipo a torneos)
 *  - equipo_alumno (jugadores del equipo)
 *  - partido       (partidos donde el equipo es local o visitante)
 *
 * Cambia los FOREIGN KEY de estas tablas que referencian a equipo(id_equipo)
 * para que usen ON DELETE CASCADE en vez de la acción por defecto (NO ACTION),
 * que bloqueaba la eliminación cuando existían filas dependientes.
 */
exports.up = async function (knex) {
  // posicion -> equipo (inscripciones a torneos)
  await knex.raw(`
    ALTER TABLE posicion
      DROP CONSTRAINT posicion_id_equipo_fkey,
      ADD CONSTRAINT posicion_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  // equipo_alumno -> equipo (jugadores)
  await knex.raw(`
    ALTER TABLE equipo_alumno
      DROP CONSTRAINT equipo_alumno_id_equipo_fkey,
      ADD CONSTRAINT equipo_alumno_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  // partido -> equipo (local)
  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_local_fkey,
      ADD CONSTRAINT partido_id_equipo_local_fkey
        FOREIGN KEY (id_equipo_local) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  // partido -> equipo (visitante)
  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_visitante_fkey,
      ADD CONSTRAINT partido_id_equipo_visitante_fkey
        FOREIGN KEY (id_equipo_visitante) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);
};

exports.down = async function (knex) {
  // Restaura la acción por defecto (NO ACTION) en todas las FKs
  await knex.raw(`
    ALTER TABLE posicion
      DROP CONSTRAINT posicion_id_equipo_fkey,
      ADD CONSTRAINT posicion_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo)
  `);

  await knex.raw(`
    ALTER TABLE equipo_alumno
      DROP CONSTRAINT equipo_alumno_id_equipo_fkey,
      ADD CONSTRAINT equipo_alumno_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo)
  `);

  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_local_fkey,
      ADD CONSTRAINT partido_id_equipo_local_fkey
        FOREIGN KEY (id_equipo_local) REFERENCES equipo(id_equipo)
  `);

  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_visitante_fkey,
      ADD CONSTRAINT partido_id_equipo_visitante_fkey
        FOREIGN KEY (id_equipo_visitante) REFERENCES equipo(id_equipo)
  `);
};
