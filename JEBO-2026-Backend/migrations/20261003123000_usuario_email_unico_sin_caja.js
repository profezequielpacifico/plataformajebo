/**
 * Un email es UN email: la unicidad no puede depender de la caja.
 *
 * El problema medido, contra la base de desarrollo:
 *
 *   POST /api/users  { ..., "email": "ADMIN@jebo2026.com" }   ->  201
 *   POST /api/auth/login { "email": "ADMIN@jebo2026.com" }     ->  200 (id 503)
 *   POST /api/auth/login { "email": "admin@jebo2026.com" }     ->  200 (id 1)
 *
 * Dos cuentas, dos personas mirando la pantalla de Usuarios como si fueran la
 * misma, y las dos sirviendo para entrar. La causa es que la restricción era
 * `UNIQUE (email)`, que en Postgres compara byte a byte: `ADMIN@…` y `admin@…`
 * son valores distintos. Y el chequeo de la aplicación (`findByEmail`) tampoco
 * ayudaba: comparaba exacto, así que la cuenta en minúscula le era invisible a
 * la que estaba en mayúscula. Un `UNIQUE (lower(email))` cierra las dos cosas
 * de una: el índice nuevo rechaza la segunda alta y el `normalizarEmail` de los
 * servicios hace que buscar y guardar usen la misma forma.
 *
 * Por qué el índice y no solo la validación: la validación solo corre si el
 * alta pasa por la API. Los seeds, `scripts/demo-gimnasia.js` y cualquier
 * consola contra la base escriben en `usuario` sin pasar por ahí, y fue
 * justamente un script de demo el que dejó los datos de los jueces.
 *
 * El `UPDATE` previo normaliza lo que ya está guardado. Sin él, el índice nuevo
 * sería correcto pero `findByEmail` (exacto) dejaría de encontrar las cuentas
 * que quedaron en mayúscula después de migrar.
 *
 * Si ya existieran dos cuentas que solo difieren en la caja, la migración
 * aborta y los nombra. Borrar una cuenta automáticamente para que pase no es una
 * decisión que pueda tomar una migración: son dos personas con dos historiales,
 * y cuál sobrevive lo tiene que decidir alguien.
 */
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