/**
 * Agrega el rol "Juez" para gimnasia.
 *
 * Los jueces se asignan a presentaciones via `staff_presentacion`
 * con rol `JUEZ_PRESIDENTE` o `JUEZ`. Este rol en `usuario.id_rol`
 * habilita los guards de autorizacion (pantalla de evaluacion,
 * listado filtrado, etc).
 *
 * Id 4 elegido por ser el siguiente correlativo libre tras 1,2,3.
 * No usa un numero alto como SuperAdmin (20) porque no hay riesgo
 * de colision con ids historicos retirados (los roles borrados fueron
 * Editor=6, Alumno=10, Visualizador=11; 4 nunca se uso).
 */
const ID_JUEZ = 4;

exports.up = async function (knex) {
  const existe = await knex.schema.hasTable('rol');
  if (!existe) throw new Error('La tabla `rol` no existe: se requiere el baseline');

  const actual = await knex('rol').where('descripcion', 'Juez').first();
  if (actual) return; // ya esta, con el id que sea

  const ocupado = await knex('rol').where('id_rol', ID_JUEZ).first();
  if (ocupado) {
    throw new Error(
      `El id_rol ${ID_JUEZ} ya lo ocupa el rol "${ocupado.descripcion}". ` +
      'No se reasigna para no cambiarle el rol a un usuario en silencio.'
    );
  }

  await knex('rol').insert({ id_rol: ID_JUEZ, descripcion: 'Juez' });
};

exports.down = async function (knex) {
  const enUso = await knex('usuario').where('id_rol', ID_JUEZ).first();
  if (enUso) {
    throw new Error(
      'Hay al menos un usuario con id_rol = 4 (Juez). Reasignale el rol ' +
      'antes de revertir esta migracion.'
    );
  }
  await knex('rol').where('id_rol', ID_JUEZ).del();
};
