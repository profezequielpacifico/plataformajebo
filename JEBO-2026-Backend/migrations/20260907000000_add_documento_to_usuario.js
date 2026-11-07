exports.up = async function (knex) {
  await knex.schema.table('usuario', (table) => {
    table.string('documento', 20).nullable();
  });

  await knex.raw(`
    UPDATE usuario AS u
    SET documento = s.marcador
    FROM (
      SELECT id_usuario, lpad(cast(row_number() over (order by id_usuario) as text), 8, '0') AS marcador
      FROM usuario
      WHERE documento IS NULL OR documento = ''
    ) AS s
    WHERE u.id_usuario = s.id_usuario;
  `);

  await knex.schema.alterTable('usuario', (table) => {
    table.string('documento', 20).notNullable().alter();
    table.unique(['documento']);
  });
};

exports.down = async function (knex) {
  await knex.schema.table('usuario', (table) => {
    table.dropUnique(['documento']);
    table.dropColumn('documento');
  });
};
