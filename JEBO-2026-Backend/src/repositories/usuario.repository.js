const knex = require('../config/knex');
const { crud } = require('./crud');
const { puedeAdministrarUsuarios } = require('../services/alcance.service');
const { validarColumnas } = require('../utils/columnas');

// Columnas que un cliente puede ver de un usuario. `password_hash` queda

const COLUMNAS_PUBLICAS = [
  'u.id_usuario',
  'u.nombre',
  'u.email',
  'u.estado',
  'u.ultimo_acceso',
  'u.creado_en',
  'u.actualizado_en',
  'u.documento',
  // No es un dato de perfil, pero el servicio de auth lo necesita para emitir el

  'u.token_version'
];

const baseQuery = () => knex('usuario as u')
  .select([...COLUMNAS_PUBLICAS, 'r.descripcion as rol_descripcion'])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

/**
 * Proyección para cuando el solicitante NO tiene alcance global (X-16).
 *
 * El problema medido: `GET /users/:id` no exigía rol y devolvía `email` y
 * `documento` —que es un DNI— de cualquier usuario a cualquier autenticado. Con
 * un token de `Profesor`, `GET /users/1` daba 200 con el email y el documento del
 * Administrador. Con 23 usuarios, eso es un padrón completo de identidades
 * personales, y `GET /users?search=` encima permitía filtrar por documento para
 * confirmar uno puntual.
 *
 * Lo que sale acá es lo mínimo para que la app funcione: `TeamFormPage` arma el
 * selector de entrenadores y `MatchFormPage` el de árbitros, y los dos necesitan
 * `id_usuario`, `nombre` y el rol. Ninguno necesita el email ni el documento de
 * un tercero.
 *
 * Se recorta en SQL, no en JavaScript: borrar la clave del objeto después de
 * traerla ya la puso en memoria y en cualquier log intermedio, que es
 * justamente lo que pasó con `password_hash`.
 *
 * `token_version` tampoco viaja: no le sirve a nadie fuera de la sesión propia y
 * es el valor que decide si un token sigue válido.
 */
// `estado` no esta a proposito (F1.1). Con alcance acotado, lo unico que un
// Profesor necesita para armar el selector de su equipo es el nombre y el rol.
// `estado` le diria si el Administrador esta Activo o Inactivo y `ultimo_acceso`
// cuando se conecto por ultima vez: datos que no hacen falta para elegir un
// entrenador, y que si sirven para saber a quien hay que auditar.
const COLUMNAS_REDUCIDAS = [
  'u.id_usuario',
  'u.nombre',
  'r.descripcion as rol_descripcion'
];

const queryReducida = () => knex('usuario as u')
  .select([...COLUMNAS_REDUCIDAS])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

/**
 * `true` si el solicitante puede ver la fila completa de `usuario`.
 *
 * Dos casos, y solo dos: administra usuarios (SuperAdmin o Administrador) o es
 * el propio usuario.
 *
 * Antes el primer caso era `alcance.global`, que incluía al Árbitro, y por lo
 * tanto le daba la fila completa —email, documento, `estado`, `ultimo_acceso`— de
 * cualquier usuario. Para un Árbitro la fila completa no le sirve: `MatchFormPage`
 * necesita `id_usuario` y `nombre` para el selector, y nada más. Y la fila
 * completa de un tercero no es un dato operativo: es el padrón de personas, abierto
 * por una vía que no debía abrirlo.
 *
 * Un Profesor tampoco entra por ninguno de los dos para sus compañeros: ver el
 * email de otro Profesor no le sirve para nada en la app y es el dato que permite
 * spear-phishing interno.
 */
const puedeVerCompleto = (alcance, solicitanteId, usuarioId) =>
  puedeAdministrarUsuarios(alcance) || String(solicitanteId) === String(usuarioId);

// Unico camino que puede devolver el hash: la verificacion de contrasena. Vive
// aca y no en `findByEmail` a proposito, para que ningun endpoint que reutilice
// ese metodo por conveniencia termine serializando el hash sin querer. Quien
// llama a esto se compromete a no devolver el objeto tal cual al cliente.
const baseQueryConHash = () => knex('usuario as u')
  .select([...COLUMNAS_PUBLICAS, 'u.password_hash', 'r.descripcion as rol_descripcion'])
  .join('rol as r', 'u.id_rol', 'r.id_rol');

module.exports = {
  // `alcance` y `solicitanteId` son obligatorios para las dos lecturas. Sin ellos
  // la función lanza, igual que los filtros de `alcance.service`: un endpoint
  // nuevo que se olvide de pasarlos no debe devolver la fila completa por
  // omisión, porque el valor por defecto seguro acá NO es el que se quiere.
  findAll: ({ alcance, solicitanteId, ...filters } = {}) => {
    if (!alcance || solicitanteId === undefined) {
      throw new Error(
        'UsuarioRepository.findAll requiere `alcance` y `solicitanteId` (X-16)'
      );
    }
    // `completo` no es `alcance.global`: ver `puedeVerCompleto`. Solo quien
    // administra usuarios ve la fila completa y solo quien administra usuarios
    // puede pedir el padrón entero.
    const completo = puedeAdministrarUsuarios(alcance);

    // Sin filtro de rol y sin administrar usuarios, esto es un padrón de
    // personas.
    //
    // La pregunta que responde `GET /users` sin `?rol=` es "quien esta dado de
    // alta en JEBO": nombre y rol de todos. Con la proyección reducida no viaja
    // ningun dato personal, pero el conjunto sigue siendo el padrón completo, y
    // eso es exactamente lo que no necesita un Profesor.
    //
    // Los consumidores que no administran usuarios ya filtran por rol
    // (`TeamFormPage` -> Profesor, `MatchFormPage` -> Arbitro,
    // `GymPresentacionesPage` -> Juez), asi que exigirlo no tiene costo y en
    // cambio cierra la enumeración también para el Árbitro, que es global pero
    // no administra usuarios.
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
        // Solo por nombre. Buscar por documento con la proyección reducida no
        // daría resultado (la columna ni está en el SELECT), pero dejar el
        // `orWhere` sobre una columna no proyectada es un error de SQL, y
        // mantenerlo abierto sería un oráculo de respuesta: "este documento
        // existe" sin devolverlo.
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
  /**
   * Nombres para los selectores de personal (F1.6).
   *
   * Reusa `COLUMNAS_REDUCIDAS` a proposito y no por comodidad: es la unica razon
   * por la que este endpoint no puede devolver email, documento ni
   * `ultimo_acceso`, que es exactamente lo que `GET /users` expone y lo que un
   * selector no necesita. Si se abriera una proyeccion nueva para "opciones mas
   * ricas", la puerta de entrada al padron estaria abierta otra vez.
   *
   * El `rol` lo valida el enum de la ruta antes de llegar aca, asi que aca no se
   * revalida: si un nombre de rol no existe, el filtro no matchea y la lista
   * vuelve vacia, que es la respuesta correcta para un selector.
   */
  findOpciones: ({ rol } = {}) => {
    let query = queryReducida();
    if (rol) query = query.where('r.descripcion', rol);
    return query.orderBy('u.nombre');
  },
  findByEmail: (email) => baseQuery().where('u.email', email).first(),
  findByDocumento: (documento) => baseQuery().where('u.documento', documento).first(),
  // Solo para `bcrypt.compare` en el login. No usar para responder a un cliente.
  findByEmailConHash: (email) => baseQueryConHash().where('u.email', email).first(),

  /**
   * Actualiza la fila y, en el MISMO statement, sube `token_version`.
   *
   * Por qué no dos statements —un `UPDATE` con los datos y después otro con el
   * contador—: entre las dos queda una ventana en la que el rol ya es el nuevo y
   * el token viejo todavía sirve. Con un solo `UPDATE` no hay ventana: o se
   * escribieron las dos cosas o no se escribió ninguna. La diferencia no es
   * estética; es que la forma de dos statements deja el sistema exactamente en el
   * estado que el cambio de rol pretendía cerrar.
   *
   * `returning('*')` devuelve la fila ya con el contador nuevo, así que el
   * servicio puede verificar que el bump ocurrió sin releer.
   *
   * El incremento va en la query, no calculado en JS: leer el valor, sumarle uno y
   * escribirlo es la misma carrera con dos pasos más, y con dos admins editando a
   * la vez dos losses dejarían el contador sin moverse.
   *
   * `revocarSesion` es explícito y no se deduce de qué campos trae `data`. Se
   * deduce en el servicio, que es quien sabe qué cambio es de credencial y cuál
   * es de perfil: acá solo se cumple.
   */
  actualizarSeguridad: async (id, data, { revocarSesion = false } = {}) => {
    // Se valida lo que vino del cliente, no el payload armado: `token_version` es
    // una columna real de `usuario`, asi que entrarla en la validación no cambiaria
    // el resultado, pero separarla deja claro que el contador no lo elige el
    // cliente en ningun sentido.
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
  // La frontera real contra mass-assignment es `soloCampos` en el
  // controlador: el servicio arma `id_rol` desde el nombre del rol y
  // `password_hash` con bcrypt, así que bloquear esas columnas acá rompería
  // el alta de usuario y el cambio de contraseña. Acá solo se sella la PK.
  ...crud('usuario', 'id_usuario'),
  updateLastAccess: (id) => knex('usuario').where('id_usuario', id).update({ ultimo_acceso: knex.fn.now() })
};
