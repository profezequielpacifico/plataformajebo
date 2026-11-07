exports.up = async function (knex) {
  const existe = await knex.schema.hasTable('login_intentos');
  if (!existe) return;

  await knex.schema.alterTable('login_intentos', (table) => {
    table.string('identificador', 255).nullable();
  });

  await knex.raw(`
    UPDATE login_intentos
       SET identificador = 'ip:' || ip
     WHERE identificador IS NULL
  `);
  await knex.raw(`
    ALTER TABLE login_intentos ALTER COLUMN identificador SET NOT NULL
  `);

  await knex.raw('ALTER TABLE login_intentos DROP CONSTRAINT IF EXISTS login_intentos_ip_unique');
  await knex.raw(`
    CREATE UNIQUE INDEX login_intentos_identificador_ip_uniq
      ON login_intentos (identificador, ip)
  `);
};

exports.down = async function (knex) {
  const existe = await knex.schema.hasTable('login_intentos');
  if (!existe) return;

  await knex.raw('DROP INDEX IF EXISTS login_intentos_identificador_ip_uniq');
  await knex.schema.alterTable('login_intentos', (table) => {
    table.dropColumn('identificador');
  });
  await knex.raw(`
    ALTER TABLE login_intentos ADD CONSTRAINT login_intentos_ip_unique UNIQUE (ip)
  `);
};
