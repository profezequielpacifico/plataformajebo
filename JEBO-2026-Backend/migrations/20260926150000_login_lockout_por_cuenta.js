/**
 * El lockout pasa a indexarse por cuenta, no solo por IP.
 *
 * Por qué: `app.js` deja `trustProxy` en 0 por default, así que `req.ip` ya no se
 * puede falsificar con `X-Forwarded-For`. Pero un límite por IP nunca fue un
 * control contra fuerza bruta: un atacante con varias IPs obtiene presupuesto
 * ilimitado contra la misma cuenta. Lo que protege una contraseña es el límite
 * por cuenta.
 *
 * El esquema pasa a una fila por (identificador, ip):
 *
 *   - `identificador` es el email en minúsculas para intentos de login. Es la
 *     clave contra la que se cuenta, y es lo que un atacante no puede rotar.
 *   - `ip` se sigue guardando y contando por separado, para no perder la señal
 *     de "muchas cuentas fallando desde el mismo origen" (credential stuffing).
 *     El bloqueo se activa si se supera cualquiera de los dos umbrales.
 *
 * Ambas columnas quedan NOT NULL con una unicidad compuesta simple, sin
 * `COALESCE`: eso permite que `onConflict(['identificador','ip'])` de Knex
 * resuelva contra el índice, que un índice sobre expresiones no permitiría.
 */
exports.up = async function (knex) {
  const existe = await knex.schema.hasTable('login_intentos');
  if (!existe) return;

  await knex.schema.alterTable('login_intentos', (table) => {
    table.string('identificador', 255).nullable();
  });

  // Filas heredadas: no tienen `identificador`, se indexan solo por IP con un
  // prefijo que no puede colisionar con un email.
  await knex.raw(`
    UPDATE login_intentos
       SET identificador = 'ip:' || ip
     WHERE identificador IS NULL
  `);
  await knex.raw(`
    ALTER TABLE login_intentos ALTER COLUMN identificador SET NOT NULL
  `);

  // `ip` era UNIQUE: con una fila por par eso impediría contar los intentos de
  // la misma cuenta desde dos IP distintas, que es justo lo que produce un
  // botnet. Se suelta la unicidad individual y se pone la del par.
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
