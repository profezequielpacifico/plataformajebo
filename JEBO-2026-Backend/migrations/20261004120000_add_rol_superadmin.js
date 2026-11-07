const ID_SUPERADMIN = 20;

exports.up = async function (knex) {
  const existe = await knex.schema.hasTable('rol');
  if (!existe) throw new Error('La tabla `rol` no existe: se requiere el baseline');

  const actual = await knex('rol').where('descripcion', 'SuperAdmin').first();
  if (actual) return;

  const ocupado = await knex('rol').where('id_rol', ID_SUPERADMIN).first();
  if (ocupado) {
    throw new Error(
      `El id_rol ${ID_SUPERADMIN} ya lo ocupa el rol "${ocupado.descripcion}". ` +
      'No se reasigna para no cambiarle el rol a un usuario en silencio.'
    );
  }

  await knex('rol').insert({ id_rol: ID_SUPERADMIN, descripcion: 'SuperAdmin' });
};

exports.down = async function (knex) {
  const enUso = await knex('usuario').where('id_rol', ID_SUPERADMIN).first();
  if (enUso) {
    throw new Error(
      'Hay al menos un usuario con id_rol = 20 (SuperAdmin). Reasignale el rol ' +
      'antes de revertir esta migracion.'
    );
  }
  await knex('rol').where('id_rol', ID_SUPERADMIN).del();
};