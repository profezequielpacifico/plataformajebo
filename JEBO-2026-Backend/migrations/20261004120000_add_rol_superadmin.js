/**
 * Agrega el rol "SuperAdmin".
 *
 * SuperAdmin es el maximo nivel de administracion: administra el sistema (usuarios,
 * geografia, seguridad, auditoria) y ademas todo lo que administra el
 * Administrador sobre la competencia. Ver `docs/modelo-roles.md`.
 *
 * Id explicito y no el de la secuencia a proposito. La secuencia
 * `rol_id_rol_seq` asigno sus valores en el orden en que se crearon los roles a
 * lo largo de la historia de la base, y dos migraciones previas la movieron
 * (`eliminar_roles_extra` borro Editor/Alumno/Visualizador, `add_rol_arbitro`
 * agrego Arbitro). Los ids que existen hoy no son 1,2,3,4 sino 1,6,10,11.
 *
 * Dejar que la secuencia decida el id nuevo seria arriesgado: si el `INSERT` corre
 * con el proximo valor de la secuencia y ese valor choca con un id retirado que
 * todavia esta en uso por una fila de `usuario`, la migracion falla; y si no
 * choca, el numero del rol nuevo queda dependiendo del historial de la base y no
 * del codigo. El frontend todavia chequea `id_rol === 1` en 5 archivos, asi que
 * el costo de un id impredecible no es teorico.
 *
 * El 20 esta libre: hoy existen los ids 1, 6, 10 y 11, y los que quedaron
 * libres de roles borrados son 2,3,4,5,7,8,9. Se elige 20 en vez del siguiente
 * correlativo justamente para no reutilizar ninguno de esos numeros retirados:
 * si un `usuario.id_rol` de una base vieja apuntara a un id retirado y ese id se
 * reasignara, ese usuario cambiaria de rol en silencio.
 *
 * Idempotente: si la fila ya existe no se inserta otra vez, y si existe con otro
 * id se respeta el que hay. No se renumera nada ni se toca `usuario.id_rol`.
 */
const ID_SUPERADMIN = 20;

exports.up = async function (knex) {
  // `hasTable` devuelve un booleano, no un objeto: desestructurarlo daba
  // `undefined` siempre y hacia fallar la migracion en una base con la tabla.
  const existe = await knex.schema.hasTable('rol');
  if (!existe) throw new Error('La tabla `rol` no existe: se requiere el baseline');

  const actual = await knex('rol').where('descripcion', 'SuperAdmin').first();
  if (actual) return; // ya esta, con el id que sea

  const ocupado = await knex('rol').where('id_rol', ID_SUPERADMIN).first();
  if (ocupado) {
    // No deberia pasar: 20 esta libre. Si una base de desarrollo lo ocupa, se
    // avisa con el nombre en vez de reusar el rol que esta ahi, que seria peor
    // que fallar.
    throw new Error(
      `El id_rol ${ID_SUPERADMIN} ya lo ocupa el rol "${ocupado.descripcion}". ` +
      'No se reasigna para no cambiarle el rol a un usuario en silencio.'
    );
  }

  await knex('rol').insert({ id_rol: ID_SUPERADMIN, descripcion: 'SuperAdmin' });
};

exports.down = async function (knex) {
  // No se baja el rol a la fuerza si alguien lo tiene asignado: dejaria
  // `usuario.id_rol` apuntando a una fila inexistente y los guards leerian un
  // rol null, que es peor que un rol que sobre.
  const enUso = await knex('usuario').where('id_rol', ID_SUPERADMIN).first();
  if (enUso) {
    throw new Error(
      'Hay al menos un usuario con id_rol = 20 (SuperAdmin). Reasignale el rol ' +
      'antes de revertir esta migracion.'
    );
  }
  await knex('rol').where('id_rol', ID_SUPERADMIN).del();
};