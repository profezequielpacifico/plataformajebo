exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE posicion
      DROP CONSTRAINT posicion_id_equipo_fkey,
      ADD CONSTRAINT posicion_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE equipo_alumno
      DROP CONSTRAINT equipo_alumno_id_equipo_fkey,
      ADD CONSTRAINT equipo_alumno_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_local_fkey,
      ADD CONSTRAINT partido_id_equipo_local_fkey
        FOREIGN KEY (id_equipo_local) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE partido
      DROP CONSTRAINT partido_id_equipo_visitante_fkey,
      ADD CONSTRAINT partido_id_equipo_visitante_fkey
        FOREIGN KEY (id_equipo_visitante) REFERENCES equipo(id_equipo) ON DELETE CASCADE
  `);
};

exports.down = async function (knex) {
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
