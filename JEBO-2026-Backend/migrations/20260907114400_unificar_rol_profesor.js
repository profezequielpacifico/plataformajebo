/**
 * Unifica los roles de Profesor y Entrenador.
 *
 * El rol "Profesor" es el único que cumple la función de entrenador/entrenador
 * de un equipo. El rol "Entrenador" (remanente) se elimina para que no aparezca
 * en el selector de roles de usuarios.
 *
 * Ningún usuario tiene asignado el rol "Entrenador" en la base actual, por lo
 * que se puede eliminar sin afectar datos existentes.
 */
exports.up = async function (knex) {
  await knex('rol').where('descripcion', 'Entrenador').del();
};

exports.down = async function (knex) {
  const exist = await knex('rol').where('descripcion', 'Entrenador').first();
  if (!exist) {
    await knex('rol').insert({ descripcion: 'Entrenador' });
  }
};
