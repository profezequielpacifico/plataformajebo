/**
 * `evento_partido`: el ledger que reemplaza al marcador tipeado a mano.
 *
 * El sistema tiene 4 deportes (Futbol, Futsal, Baloncesto, Voleibol) y "punto"
 * no significa lo mismo en todos. Lo que si es comun a los cuatro es el hecho
 * deportivo: alguien anoto, en algum momento del partido, y quedo registrado.
 * Por eso la tabla se llama `evento_partido` y no `partido_punto`, y lleva
 * `tipo_evento` desde el inicio aunque hoy solo se use ANOTACION. Agregar
 * tarjetas, faltas, cambios o sets despues es un INSERT de valores nuevos, no
 * una migracion.
 *
 * `segundos_partido` es `integer` y no `mm:ss` ni `interval`: es ordenable,
 * agregable, no depende de locale ni de zona horaria, y formatearlo es tarea
 * del frontend. Guardar el texto obligaria a parsearlo en cada consulta.
 *
 * `hora_real` la pone el DEFAULT de la base y NUNCA se acepta desde el body.
 * Es un dato de auditoria: si el cliente pudiera mandarla, un arbitro podria
 * retroadatar un gol.
 *
 * `id_usuario_arbitro` y `registrado_por` son columnas distintas a proposito.
 * En el flujo normal coinciden (el arbitro se registra a si mismo), pero
 * divergen cuando un Administrador carga en nombre de un arbitro. Para
 * auditoria interesa saber quien toco el boton, no solo a nombre de quien se
 * lo cargo.
 *
 * Las FK a `equipo` y `usuario` son RESTRICT, no CASCADE: un evento es un
 * hecho historico que no debe evaporarse porque se de de baja un equipo o un
 * usuario. La cascada desde `partido` si tiene sentido y sigue la convencion
 * que ya usan `staff_partido` y `partido_ronda`.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('evento_partido', (table) => {
    table.increments('id_evento').primary();

    table
      .integer('id_partido')
      .notNullable()
      .references('id_partido')
      .inTable('partido')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    // Secuencial dentro del partido. Es el "#2" que ve el arbitro.
    table.integer('numero_evento').notNullable();

    // Solo ANOTACION en v1. Los demas valores quedan para tarjetas, faltas,
    // cambios, sets y tiempos muertos.
    table.string('tipo_evento', 30).notNullable().defaultTo('ANOTACION');

    table
      .integer('id_equipo')
      .notNullable()
      .references('id_equipo')
      .inTable('equipo')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    // Quien arbitro el evento. La FK compuesta de mas abajo lo ata a que este
    // realmente asignado a este partido.
    //
    // NULLABLE a proposito, y solo para eventos migrados: hay partidos con
    // resultado cargado y sin ningun arbitro en `staff_partido` (6 en la base al
    // escribir esto, uno de ellos Finalizado 3-5). No se sabe quien los arbitro,
    // y asignar un arbitro cualquiera seria fabricar un dato de auditoria. La FK
    // compuesta es MATCH SIMPLE, asi que con una columna NULL no se valida y el
    // evento entra sin romper integridad; el servicio, en cambio, SI exige el
    // arbitro en todo evento nuevo.
    table
      .integer('id_usuario_arbitro')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    // Quien ejecuto la operacion (puede ser un Admin en nombre de un arbitro).
    // NULL tambien significa "migrado: no se sabe quien lo cargo".
    table
      .integer('registrado_por')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('RESTRICT');

    // NULL solo en eventos migrados desde el marcador manual, donde no se
    // conoce el momento real del gol. La UI muestra "-" para esos.
    table.integer('segundos_partido').nullable();

    table.timestamp('hora_real').notNullable().defaultTo(knex.fn.now());

    // CONFIRMADO | ANULADO. Terminal: un evento anulado no vuelve a
    // confirmarse, la correccion es anular el viejo y registrar el nuevo.
    table.string('estado', 20).notNullable().defaultTo('CONFIRMADO');

    // Doble tap / retry de red. El indice unico parcial de mas abajo absorbe
    // el duplicado y devuelve el evento ya creado en vez de insertar otro.
    table.string('idempotency_key', 64).nullable();

    table
      .integer('anulado_por')
      .nullable()
      .references('id_usuario')
      .inTable('usuario')
      .onUpdate('CASCADE')
      .onDelete('SET NULL');

    table.timestamp('anulado_en').nullable();
    table.text('motivo_anulacion').nullable();

    table.timestamp('creado_en').notNullable().defaultTo(knex.fn.now());
  });

  // El numero de evento es unico dentro del partido. Ademas de ser la garantia
  // de integridad, es la que hace que la carrera del MAX+1 falle ruidosamente
  // en vez de duplicar numeros en silencio.
  await knex.raw(`
    CREATE UNIQUE INDEX evento_partido_partido_numero_uk
      ON evento_partido (id_partido, numero_evento)
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX evento_partido_idem_uk
      ON evento_partido (id_partido, idempotency_key)
      WHERE idempotency_key IS NOT NULL
  `);

  // De apoyo para el calculo del marcador, que cuenta por (partido, equipo)
  // los eventos confirmados. Un indice parcial sobre el filtro exacto del
  // COUNT evita que el marcador recorra todo el historico de eventos.
  await knex.raw(`
    CREATE INDEX evento_partido_marcador_ix
      ON evento_partido (id_partido, id_equipo)
      WHERE estado = 'CONFIRMADO' AND tipo_evento = 'ANOTACION'
  `);

  // Historial paginado, que es la consulta mas frecuente de la pantalla en
  // vivo (ordenada por numero descendente, dentro de un partido).
  await knex.raw(`
    CREATE INDEX evento_partido_historial_ix
      ON evento_partido (id_partido, numero_evento DESC)
  `);

  await knex.raw(`
    ALTER TABLE evento_partido
      DROP CONSTRAINT IF EXISTS evento_partido_estado_ck
  `);
  await knex.raw(`
    ALTER TABLE evento_partido
      ADD CONSTRAINT evento_partido_estado_ck
      CHECK (estado IN ('CONFIRMADO', 'ANULADO'))
  `);

  // `id_usuario_arbitro` tiene que ser UNO de los arbitros de este partido, y
  // eso no se puede expresar con una FK simple: la columna apunta a `usuario`,
  // no a "un arbitro de este partido". Se resuelve con una FK compuesta contra
  // un unique sobre (id_partido, id_usuario) en `staff_partido`, de modo que
  // la base lo rechaza y no solo el servicio.
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS staff_partido_partido_usuario_uk
      ON staff_partido (id_partido, id_usuario)
  `);

  await knex.raw(`
    ALTER TABLE evento_partido
      DROP CONSTRAINT IF EXISTS evento_partido_arbitro_asignado_fkey
  `);
  await knex.raw(`
    ALTER TABLE evento_partido
      ADD CONSTRAINT evento_partido_arbitro_asignado_fkey
      FOREIGN KEY (id_partido, id_usuario_arbitro)
      REFERENCES staff_partido (id_partido, id_usuario)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  `);
};

exports.down = async function down(knex) {
  // La tabla primero: su FK compuesta depende del unique de `staff_partido`, y
  // dropear el indice antes dejaria la tabla colgando de un indice que ya no
  // existe.
  await knex.schema.dropTableIfExists('evento_partido');
  await knex.raw('DROP INDEX IF EXISTS staff_partido_partido_usuario_uk');
};
