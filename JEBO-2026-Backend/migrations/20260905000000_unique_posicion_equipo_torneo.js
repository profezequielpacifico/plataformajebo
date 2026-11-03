/**
 * Garantiza a nivel de base de datos que un equipo no pueda estar inscrito
 * dos veces en el mismo torneo.
 */
exports.up = async function (knex) {
  const hasIndex = await knex.raw(
    "SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'posicion' AND indexname = 'posicion_id_equipo_id_torneo_unique'"
  );
  if (hasIndex.rows.length) return;

  await knex.schema.table('posicion', (table) => {
    table.unique(['id_equipo', 'id_torneo']);
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('posicion', (table) => {
    table.dropUnique(['id_equipo', 'id_torneo']);
  });
};