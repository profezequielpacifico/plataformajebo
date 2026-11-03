/**
 * Aislamiento entre instituciones (X-05), parte 1: poblar `usuario_institucion`.
 *
 * El problema: `equipo` tiene `id_institucion`, pero ninguna consulta de lectura
 * filtraba por ella y el JWT no decía a qué instituciones pertenece el usuario.
 * Medido: un token de `Profesor` veía los equipos de 7 instituciones distintas y
 * podía abrir `/teams/22`, de una institución ajena, con 200.
 *
 * Por qué la tabla estaba vacía: `usuario_institucion` existe desde la migración
 * baseline, pero nunca se escribieron filas y el frontend no tiene ninguna
 * pantalla para hacerlo. El dato de pertenencia sí estaba en la base, derivado:
 * `equipo.id_usuario` es el usuario que dio de alta el equipo, y
 * `equipo.id_institucion` es su institución. Esta migración convierte ese dato
 * derivado en el dato explícito.
 *
 * La REGLA, que es una decisión de producto y no una consecuencia de los datos:
 *
 *   - Profesor → las instituciones de los equipos que creó. Si creó equipos en
 *     varias, queda en varias.
 *   - Administrador y Árbitro → alcance global, sin filtro de institución.
 *   - Un Profesor sin ningún equipo creado → queda SIN instituciones, y por lo
 *     tanto no ve datos institucionales hasta que se le asigne alguna. Es
 *     deliberado: preferimos que vea de menos antes que abrirle el tenant
 *     equivocado. Es el unico caso donde el filtro deja al usuario sin nada, y
 *     por eso queda escrito acá y no solo en el reporte.
 *
 * Lo que NO hace esta migración: crear filas para Administradores o Arbitros.
 * Su bypass es de código (`alcance.service`), no de datos, para que cambiar el
 * criterio no requiera volver a correr una migración.
 *
 * Es idempotente: `onConflict.ignore()` sobre la pareja (usuario, institución).
 * Reconstruir una base con datos nuevos vuelve a correrla sin duplicar.
 */
exports.up = async function (knex) {
  const existeTabla = await knex.schema.hasTable('usuario_institucion');
  if (!existeTabla) {
    // La tabla no debería faltar: viene de la baseline. Si no está, el aislamiento
    // no se puede sostener y conviene fallar acá, en el deploy, y no en runtime
    // con un `SELECT` sobre una tabla inexistente.
    throw new Error(
      'usuario_institucion no existe: no se puede aplicar el aislamiento por institución (X-05)'
    );
  }

  // La tabla venía de la baseline con solo la PK surrogate `id_usuario_institucion`
  // y NINGUNA restricción sobre la pareja. Sin el índice único de abajo, el
  // `onConflict.ignore()` no tiene contra qué resolver y la migración falla con
  // "there is no unique or exclusion constraint matching the ON CONFLICT
  // specification" — que es exactamente por donde cayó la primera corrida contra
  // la base de producción, no la base de test.
  //
  // Se deduplica antes de crearlo: si otra ruta ya insertó pares repetidos, el
  // `CREATE UNIQUE INDEX` aborta y la migración no avanza.
  const paresRepetidos = await knex('usuario_institucion')
    .select('id_usuario', 'id_institucion')
    .count('* as n')
    .groupBy('id_usuario', 'id_institucion')
    .havingRaw('COUNT(*) > 1');

  for (const d of paresRepetidos) {
    await knex('usuario_institucion')
      .where({ id_usuario: d.id_usuario, id_institucion: d.id_institucion })
      .whereNot(
        'id_usuario_institucion',
        knex('usuario_institucion').min('id_usuario_institucion')
      )
      .del();
  }

  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS usuario_institucion_usuario_institucion_unq
      ON usuario_institucion (id_usuario, id_institucion)
  `);

  // Índice de lectura. El backend resuelve el alcance en cada request
  // autenticado de un usuario con alcance acotado, así que la consulta es del
  // camino caliente. Sin índice es un seq scan sobre una tabla que crece con
  // usuarios × instituciones.
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS usuario_institucion_id_usuario_idx
      ON usuario_institucion (id_usuario)
  `);

  // Solo rol Profesor. Los roles se toman por descripción y no por id
  // hardcodeado: la migración `20260907120300_add_rol_arbitro` ya renumeró los
  // ids una vez, y un `WHERE id_rol = 6` fijo sería una bomba de tiempo.
  //
  // `DISTINCT` porque un profesor puede tener varios equipos en la misma
  // institución, y la pareja tiene que ser única.
  const pares = await knex('equipo as e')
    .join('usuario as u', 'e.id_usuario', 'u.id_usuario')
    .join('rol as r', 'u.id_rol', 'r.id_rol')
    .whereNotNull('e.id_usuario')
    .whereNotNull('e.id_institucion')
    .where('r.descripcion', 'Profesor')
    .distinct('e.id_usuario', 'e.id_institucion')
    .select('e.id_usuario', 'e.id_institucion');

  if (pares.length === 0) {
    return;
  }

  const filas = pares.map((p) => ({
    id_usuario: p.id_usuario,
    id_institucion: p.id_institucion
  }));

  await knex('usuario_institucion')
    .insert(filas)
    .onConflict(['id_usuario', 'id_institucion'])
    .ignore();
};

exports.down = async function (knex) {
  // Solo se borra lo que esta migración agrego. No se puede distinguir una fila
  // derivada de una cargada a mano sin una columna de origen, así que el
  // rollback es conservador: borra las filas de los usuarios que aparecen como
  // creadores de algún equipo y deja intactas las de los demás.
  //
  // Un rollback que borrara de más sería peor que uno que no deshaga nada, porque
  // `usuario_institucion` hoy no tiene otra fuente que la vuelva a llenar.
  await knex('usuario_institucion')
    .whereIn(
      'id_usuario',
      knex('equipo').distinct('id_usuario').whereNotNull('id_usuario')
    )
    .del();

  await knex.raw('DROP INDEX IF EXISTS usuario_institucion_id_usuario_idx');
  await knex.raw('DROP INDEX IF EXISTS usuario_institucion_usuario_institucion_unq');
};
