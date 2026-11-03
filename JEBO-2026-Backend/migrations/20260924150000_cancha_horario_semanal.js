exports.up = async function (knex) {
  await knex.schema.createTable('cancha_horario_semanal', (table) => {
    table.increments('id_cancha_horario').primary();
    table.integer('id_cancha').notNullable().references('id_cancha').inTable('cancha').onDelete('CASCADE');
    table.smallint('dia_semana').notNullable().checkBetween([1, 7]);
    table.integer('id_horario_cancha').notNullable().references('id_horario_cancha').inTable('horarios_cancha');
    table.unique(['id_cancha', 'dia_semana', 'id_horario_cancha']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTable('cancha_horario_semanal');
};