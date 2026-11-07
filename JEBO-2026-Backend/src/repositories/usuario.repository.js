const knex = require('../config/knex');
const { crud } = require('./crud');
const { puedeAdministrarUsuarios } = require('../services/alcance.service');
const { validarColumnas } = require('../utils/columnas');

const COLUMNAS_PUBLICAS = [
  'u.id_usuario',
  'u.nombre',
  'u.email',
  'u.estado',
  'u.ultimo_acceso',
  'u.creado_en',
  'u.actualizado_en',
  'u.documento',

  'u.token_version'
];

const baseQuery = () => knex('usuario as u')
  .select([...COLUMNAS_PUBLICAS, 'r.descripcion as rol_descripcion'])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

const COLUMNAS_REDUCIDAS = [
  'u.id_usuario',
  'u.nombre',
  'r.descripcion as rol_descripcion'
];

const queryReducida = () => knex('usuario as u')
  .select([...COLUMNAS_REDUCIDAS])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

const puedeVerCompleto = (alcance, solicitanteId, usuarioId) =>
  puedeAdministrarUsuarios(alcance) || String(solicitanteId) === String(usuarioId);

const baseQueryConHash = () => knex('usuario as u')
  .select([...COLUMNAS_PUBLICAS, 'u.password_hash', 'r.descripcion as rol_descripcion'])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

module.exports = {
  findAll: ({ alcance, solicitanteId, ...filters } = {}) => {
    if (!alcance || solicitanteId === undefined) {
      throw new Error(
        'UsuarioRepository.findAll requiere `alcance` y `solicitanteId` (X-16)'
      );
    }
    const completo = puedeAdministrarUsuarios(alcance);

    if (!completo && !filters.rol) {
      throw new Error(
        'UsuarioRepository.findAll exige `rol` para quien no administra usuarios ' +
        '(F1.1): sin filtro devuelve el padrón completo de usuarios.'
      );
    }

    let query = completo ? baseQuery() : queryReducida();

    if (filters.rol) query = query.where('r.descripcion', filters.rol);
    if (filters.search) {
      if (completo) {
        query = query.where(function () {
          this.where('u.nombre', 'ilike', `%${filters.search}%`)
            .orWhere('u.documento', 'ilike', `%${filters.search}%`);
        });
      } else {
        query = query.where('u.nombre', 'ilike', `%${filters.search}%`);
      }
    }
    return query.orderBy('u.nombre');
  },
  findById: (id, { alcance, solicitanteId } = {}) => {
    if (!alcance || solicitanteId === undefined) {
      throw new Error(
        'UsuarioRepository.findById requiere `alcance` y `solicitanteId` (X-16)'
      );
    }
    const completo = puedeVerCompleto(alcance, solicitanteId, id);
    return (completo ? baseQuery() : queryReducida()).where('u.id_usuario', id).first();
  },
  findOpciones: ({ rol } = {}) => {
    let query = queryReducida();
    if (rol) query = query.where('r.descripcion', rol);
    return query.orderBy('u.nombre');
  },
  findByEmail: (email) => baseQuery().where('u.email', email).first(),
  findByDocumento: (documento) => baseQuery().where('u.documento', documento).first(),
  findByEmailConHash: (email) => baseQueryConHash().where('u.email', email).first(),

  actualizarSeguridad: async (id, data, { revocarSesion = false } = {}) => {
    await validarColumnas('usuario', data, { pk: 'id_usuario' });

    const payload = { ...data };
    if (revocarSesion) {
      payload.token_version = knex.raw('COALESCE(token_version, 1) + 1');
    }

    return knex('usuario')
      .where('id_usuario', id)
      .update(payload)
      .returning('*')
      .then((r) => r[0]);
  },
  ...crud('usuario', 'id_usuario'),
  updateLastAccess: (id) => knex('usuario').where('id_usuario', id).update({ ultimo_acceso: knex.fn.now() })
};
