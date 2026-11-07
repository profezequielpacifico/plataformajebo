exports.up = async function (knex) {
  const existeTabla = await knex.schema.hasTable('usuario_institucion');
  if (!existeTabla) {
    throw new Error(
      'usuario_institucion no existe: no se puede aplicar el aislamiento por institución (X-05)'
    );
  }

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

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS usuario_institucion_id_usuario_idx
      ON usuario_institucion (id_usuario)
  `);

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
  await knex('usuario_institucion')
    .whereIn(
      'id_usuario',
      knex('equipo').distinct('id_usuario').whereNotNull('id_usuario')
    )
    .del();

  await knex.raw('DROP INDEX IF EXISTS usuario_institucion_id_usuario_idx');
  await knex.raw('DROP INDEX IF EXISTS usuario_institucion_usuario_institucion_unq');
};
