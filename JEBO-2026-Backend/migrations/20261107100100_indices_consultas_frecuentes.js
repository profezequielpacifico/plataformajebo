const INDICES = [
  ['partido_id_torneo_ix', 'partido (id_torneo)'],
  ['partido_id_equipo_local_ix', 'partido (id_equipo_local)'],
  ['partido_id_equipo_visitante_ix', 'partido (id_equipo_visitante)'],
  ['partido_creado_en_ix', 'partido (creado_en DESC)'],
  ['posicion_id_torneo_ix', 'posicion (id_torneo)'],
  ['equipo_id_institucion_ix', 'equipo (id_institucion)'],
  ['equipo_alumno_id_equipo_ix', 'equipo_alumno (id_equipo)'],
  ['staff_partido_id_usuario_ix', 'staff_partido (id_usuario)'],
  ['bitacora_fecha_hora_ix', 'bitacora (fecha_hora DESC)']
];

exports.config = { transaction: false };

exports.up = async (knex) => {
  for (const [nombre, definicion] of INDICES) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${nombre}`);
    await knex.raw(`CREATE INDEX CONCURRENTLY ${nombre} ON ${definicion}`);
  }
};

exports.down = async (knex) => {
  for (const [nombre] of INDICES) {
    await knex.raw(`DROP INDEX CONCURRENTLY IF EXISTS ${nombre}`);
  }
};
