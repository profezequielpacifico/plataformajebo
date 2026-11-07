exports.up = function (knex) {
  return knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS institucion_distrito_nombre_uk
    ON institucion (id_distrito, lower(btrim(nombre)))
  `);
};

exports.down = function (knex) {
  return knex.raw('DROP INDEX IF EXISTS institucion_distrito_nombre_uk');
};
