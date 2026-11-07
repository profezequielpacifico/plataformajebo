exports.up = async function (knex) {
  const existeTabla = await knex.schema.hasTable('refresh_token_revocado');
  if (!existeTabla) {
    await knex.schema.createTable('refresh_token_revocado', (table) => {
      table.string('jti', 255).primary();
      table.bigInteger('id_usuario').notNullable();
      table.timestamp('revocado_en').notNullable().defaultTo(knex.fn.now());
      table.timestamp('expira_en').notNullable();
    });

    await knex.raw(`
      CREATE INDEX refresh_token_revocado_expira_en_idx
        ON refresh_token_revocado (expira_en)
    `);
    await knex.raw(`
      CREATE INDEX refresh_token_revocado_id_usuario_idx
        ON refresh_token_revocado (id_usuario)
    `);
  }

  const tieneVersion = await knex.schema.hasColumn('usuario', 'token_version');
  if (!tieneVersion) {
    await knex.schema.alterTable('usuario', (table) => {
      table.integer('token_version').notNullable().defaultTo(1);
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('refresh_token_revocado');
  const tieneVersion = await knex.schema.hasColumn('usuario', 'token_version');
  if (tieneVersion) {
    await knex.schema.alterTable('usuario', (table) => {
      table.dropColumn('token_version');
    });
  }
};
