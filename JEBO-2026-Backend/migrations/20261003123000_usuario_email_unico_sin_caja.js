exports.up = async function up(knex) {
  const gemelas = await knex.raw(`
    SELECT lower(btrim(email)) AS email,
           array_agg(id_usuario ORDER BY id_usuario) AS ids
      FROM usuario
     GROUP BY lower(btrim(email))
    HAVING count(*) > 1
  `);

  if (gemelas.rowCount > 0) {
    const detalle = gemelas.rows
      .map((r) => `${r.email} (usuarios ${r.ids.join(', ')})`)
      .join('; ');
    throw new Error(
      'No se puede aplicar el índice único por email sin distinguir mayúsculas: ' +
        'ya existen cuentas que comparten email. Revisá y unificá estas cuentas primero: ' +
        detalle
    );
  }

  await knex.raw(
    "UPDATE usuario SET email = lower(btrim(email)) WHERE email <> lower(btrim(email))"
  );

  await knex.raw('ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_email_key');
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS usuario_email_lower_uk ON usuario (lower(email))'
  );
};

exports.down = async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS usuario_email_lower_uk');
  await knex.raw(
    'ALTER TABLE usuario ADD CONSTRAINT usuario_email_key UNIQUE (email)'
  );
};