exports.up = async function (knex) {
  await knex.raw('ALTER TABLE partido ALTER COLUMN id_disponibilidad DROP NOT NULL');
};

exports.down = async function (knex) {
  await knex.raw('UPDATE partido SET id_disponibilidad = 0 WHERE id_disponibilidad IS NULL');
  await knex.raw('ALTER TABLE partido ALTER COLUMN id_disponibilidad SET NOT NULL');
};
