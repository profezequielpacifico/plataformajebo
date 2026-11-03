/**
 * Revocación de refresh tokens, para que `logout` deje de ser un mensaje.
 *
 * Por qué: el refresh token dura 7 días y `POST /auth/logout` solo devolvía
 * "Sesión cerrada exitosamente". Medido: tras el logout, `POST /auth/refresh`
 * con el mismo token devolvía 200 y un access token nuevo, y el access token
 * anterior seguía funcionando en `GET /auth/me`. Cerrar sesión en un equipo
 * compartido dejaba una credencial válida por una semana.
 *
 * El enfoque es una denylist por `jti`, no una allowlist por sesión:
 *
 *   - Una allowlist obligaría a guardar el estado de cada sesión emitida y a
 *     consultar la base en cada refresh y en cada request autenticado. Con la
 *     denylist, el camino caliente (verificar firma) no toca la base.
 *   - Solo se revocan los tokens emitidos, así que la denylist crece con los
 *     logouts, no con los logins. Se poda sola.
 *
 * `token_version` queda como red de contención para el peor caso: si un token
 * se filtra y el cliente nunca llama a `logout`, subir la versión del usuario
 * invalida todos sus tokens de una. Es el interruptor de emergencia.
 */
exports.up = async function (knex) {
  const existeTabla = await knex.schema.hasTable('refresh_token_revocado');
  if (!existeTabla) {
    await knex.schema.createTable('refresh_token_revocado', (table) => {
      // `jti` del token. ElRefresh token se firma con `jwtid`, así que es único
      // por token emitido, no por usuario.
      table.string('jti', 255).primary();
      table.bigInteger('id_usuario').notNullable();
      table.timestamp('revocado_en').notNullable().defaultTo(knex.fn.now());
      // Cuándo deja de ser necesario guardar la entrada: el refresh expira a los
      // 7 días, y pasado ese punto nadie puede presentar el token.
      table.timestamp('expira_en').notNullable();
    });

    // La poda usa `expira_en`: se compara contra el reloj, no contra el
    // `expiresIn` de cada token.
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
      // 1 = estado normal. Subirlo invalida todos los tokens del usuario. Por
      // qué arranca en 1 y no en 0: 0 es el valor que tendría una fila creada
      // antes de la migración, y "incrementar" desde 0 lo llevaría a 1, que es
      // el estado por defecto — el incremento no invalidaría nada.
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
