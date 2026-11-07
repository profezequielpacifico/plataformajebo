exports.up = async function (knex) {
  await knex.transaction(async (trx) => {
    const aEliminar = ['Editor', 'Alumno', 'Visualizador'];

    let defaultRole = await trx('rol').where('descripcion', 'Profesor').first();
    if (!defaultRole) {
      const nextId = await trx('rol').max('id_rol as max');
      const id = (nextId[0].max || 0) + 1;
      [defaultRole] = await trx('rol').insert({ id, descripcion: 'Profesor' }).returning('*');
    }

    await trx('usuario')
      .whereIn(
        'id_rol',
        trx('rol').select('id_rol').whereIn('descripcion', aEliminar)
      )
      .update({ id_rol: defaultRole.id_rol });

    await trx('rol').whereIn('descripcion', aEliminar).del();
  });
};

exports.down = async function (knex) {
  const existentes = await knex('rol').pluck('descripcion');
  const aCrear = ['Editor', 'Alumno', 'Visualizador'].filter((r) => !existentes.includes(r));
  for (const desc of aCrear) {
    await knex('rol').insert({ descripcion: desc });
  }
};
