const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe, cookiesDe } = require('../helpers/cookies');

/**
 * F1.5: `estado` escribible, y el corte de sesión atómico con el cambio.
 *
 * Son tres cosas que se cerraron en una sola pasada porque comparten la misma
 * raíz: el token afirma cosas —qué rol tiene, si la cuenta sirve— que la base
 * puede dejar de afirmar, y hasta ahora nadie actualizaba esa mitad.
 *
 *  1. `estado` no se podía escribir. `auth.service` ya rechazaba el login de un
 *     Inactivo, pero no había ninguna forma administrativa de volver Inactivo a
 *     alguien: la columna era de solo lectura en la práctica. La comprobación
 *     existía sin disparador.
 *  2. Cambiar el rol no subía `token_version`. El rol viaja embebido en el token
 *     y `authenticate` no consulta la base, así que un Administrador degradado a
 *     Árbitro conservaba el panel de admin hasta que su access vencía (1 h).
 *  3. El bump iba en un segundo `UPDATE`. Entre el `UPDATE` de los datos y el del
 *     contador hay un instante en que el rol nuevo ya está escrito y el token
 *     viejo todavía sirve: exactamente el estado que el punto 2 vino a cerrar. Los
 *     dos van ahora en un solo statement.
 *
 * La suite es una secuencia sobre los mismos usuarios, no casos independientes:
 * el estado es la historia (activo → desactivado → reactivado → degradado) y
 * partirlo en `beforeEach` obligaría a reconstruirla sin probar nada del medio.
 *
 * Los documentos son de un rango propio (9000031x) que ninguna otra suite usa,
 * y `documento` es UNIQUE en la base: dos suites que comparten uno fallan por
 * violación de clave foránea al final del cleanup de la otra, que es un fallo
 * engañoso porque apunta a la suite equivocada.
 */

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;
const PASA = (email) => `${email}_${TAG}@jebo.test`;

const EMAIL_ADMIN = PASA('admin');
const EMAIL_OBJETIVO = PASA('estado');
const PASSWORD = contrasenaDePrueba();

let tokenAdmin;
let idAdmin;
let idObjetivo;

const tokenVersionDe = async (id) => {
  const r = await dbQuery('SELECT token_version FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].token_version;
};

const estadoDe = async (id) => {
  const r = await dbQuery('SELECT estado FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].estado;
};

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0].id_rol;
};

const filaDe = async (id) => {
  const r = await dbQuery(
    'SELECT id_rol, estado, token_version FROM usuario WHERE id_usuario = $1',
    [id]
  );
  return r.rows[0];
};

const sesionDe = (password) =>
  request(app).post('/auth/login').send({ email: EMAIL_OBJETIVO, password });

const refrescar = (loginRes) => request(app).post('/auth/refresh').set(cookiesDe(loginRes)).send();

/** `PUT /users/:id` hecho por el Administrador de la suite. */
const editar = (id, body) =>
  request(app)
    .put(`/users/${id}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(body);

beforeAll(async () => {
  const idRolAdmin = await idRolDe('Administrador');

  const crear = async (nombre, email, documento) => {
    const hash = await bcrypt.hash(PASSWORD, 4);
    const ins = await dbQuery(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
       VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
      [nombre, email, hash, idRolAdmin, documento]
    );
    return ins.rows[0].id_usuario;
  };

  idObjetivo = await crear('Objetivo Estado', EMAIL_OBJETIVO, '90000311');
  idAdmin = await crear('Administrador Estado', EMAIL_ADMIN, '90000310');

  const login = await request(app)
    .post('/auth/login')
    .send({ email: EMAIL_ADMIN, password: PASSWORD });
  expect(login.status).toBe(200);
  tokenAdmin = accessTokenDe(login);
});

afterAll(async () => {
  await dbQuery(
    `DELETE FROM bitacora
      WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)
         OR detalle::jsonb->>'entityId' IN (
              SELECT id_usuario::text FROM usuario WHERE email LIKE $1
            )`,
    [SUFIJO]
  );
  await dbQuery(
    'DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [SUFIJO]
  );
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [SUFIJO]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [SUFIJO]);
});

describe('F1.5.1 — `estado` es escribible y cierra el ciclo de activacion', () => {
  it('un Administrador puede desactivar a un tercero, y su sesion vieja muere', async () => {
    // La sesión se saca ANTES de desactivar, y por eso la aserción del contador
    // vive acá y no en el test siguiente: una vez Inactivo, la cuenta no puede
    // iniciar sesión, así que la única forma de tener un token "de antes" es
    // haberlo Conseguido mientras la cuenta todavía servía.
    const sesionVieja = await sesionDe(PASSWORD);
    expect(sesionVieja.status).toBe(200);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Inactivo' });
    expect(r.status).toBe(200);
    expect(await estadoDe(idObjetivo)).toBe('Inactivo');

    // El corte es real: ese refresh, emitido con la cuenta activa, ya no renueva.
    expect((await refrescar(sesionVieja)).status).toBe(401);

    // Y el contador se movió. La aserción del 401 de arriba NO alcanza para
    // probarlo: `refresh` ya rechazaba al Inactivo por su propia cuenta, mirando
    // `estado` antes que `token_version`. Lo que demuestra que el bump pasó es el
    // número —y por eso está separado del 401, que probaría menos.
    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes + 1);
  });

  it('la cuenta desactivada no entra por login, y no lo dice', async () => {
    // Antes de F1.5 esta comprobación existía en `auth.service` y no tenía nada
    // que la disparara. Ahora hay una puerta que la dispara.
    //
    // Y al darle un disparador, esa puerta se abrió con un agujero: la respuesta
    // decía "Usuario inactivo". Con eso, probar `jefe@colegio.edu` con cualquier
    // contraseña dice si la cuenta existe y si está dada de baja — un oráculo del
    // padrón, que es el dato que un ataque de fuerza bruta necesita para elegir a
    // quién insistir. La respuesta tiene que ser indistinguible de la de una
    // contraseña incorrecta.
    const r = await sesionDe(PASSWORD);
    expect(r.status).toBe(401);
    expect(r.body.error).toMatch(/credenciales/i);
    expect(r.body.error).not.toMatch(/inactiv/i);
  });

  it('el motivo real queda en la bitacora igual', async () => {
    // Lo que se le saca al cliente no se le saca al administrador: si el login de
    // un Inactivo dice "credenciales inválidas", la única forma de saber que la
    // cuenta está dada de baja es el registro del intento.
    const r = await dbQuery(
      `SELECT detalle FROM bitacora
        WHERE id_usuario = $1 AND tipo_accion = 'INTENTO_FALLIDO'
        ORDER BY id_bitacora DESC LIMIT 1`,
      [idObjetivo]
    );
    expect(r.rows[0].detalle).toMatch(/inactivo/i);
  });

  it('reactivar deja volver a entrar: desactivar no es puerta de una sola via', async () => {
    // Si reactivar no funcionara, el error de desactivar a alguien sin querer
    // sería irreversible sin un `UPDATE` a mano en la base. Es la contraprueba
    // que hace falta junto con el test del login bloqueado.
    const r = await editar(idObjetivo, { estado: 'Activo' });
    expect(r.status).toBe(200);
    expect(await estadoDe(idObjetivo)).toBe('Activo');

    const login = await sesionDe(PASSWORD);
    expect(login.status).toBe(200);
    expect((await refrescar(login)).status).toBe(200);
  });

  it('un estado que no existe es 400 y no escribe nada', async () => {
    const antes = await filaDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Puspendido' });
    expect(r.status).toBe(400);

    // Un `estado` arbitrario deja la cuenta en un limbo: el login la rechaza
    // (`!== 'Activo'`) y ninguna pantalla la puede sacar de ahí porque el `<select>`
    // no tiene ese valor. Por eso el enum se valida en la ruta y en el servicio, en
    // vez de dejar que el texto entre a la columna.
    expect(await filaDe(idObjetivo)).toEqual(antes);
  });

  it('reenviar el estado que ya tiene no corta la sesion', async () => {
    // El formulario de edición manda todos los campos. Si "mandó `estado`"
    // bastara para subir `token_version`, guardar el usuario sin cambiar nada
    // expulsaría a la persona de la aplicación —un logout forzado por un tilde—.
    //
    // El otro lado del error también está cubierto: si la comparación fallara
    // siempre hacia "no cambió", una desactivación real dejaría el token viejo
    // vivo, que es el agujero que F1.5 vino a tapar.
    const login = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Activo' });
    expect(r.status).toBe(200);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes);
    expect((await refrescar(login)).status).toBe(200);
  });
});

describe('F1.5.2 — cambiar el rol invalida lo que el token afirma', () => {
  it('Administrador -> SuperAdmin sube el contador', async () => {
    const sesionVieja = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'SuperAdmin' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('SuperAdmin'));
    expect(fila.token_version).toBe(versionAntes + 1);
    expect((await refrescar(sesionVieja)).status).toBe(401);
  });

  it('SuperAdmin -> Administrador tambien', async () => {
    // La dirección importa: el caso interesante no es promover sino degradar, que
    // es donde un token con permisos de más es un agujero. Va en las dos
    // direcciones porque el código no las distingue y un test que solo cubriera una
    // dejaría la otra sin verificar.
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Administrador' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('Administrador'));
    expect(fila.token_version).toBe(versionAntes + 1);
  });

  it('bajar a un rol inferior tambien, y el token viejo deja de renovar', async () => {
    const sesionVieja = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Arbitro' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('Arbitro'));
    expect(fila.token_version).toBe(versionAntes + 1);
    expect((await refrescar(sesionVieja)).status).toBe(401);

    // Vuelve a Administrador: el resto de la suite necesita un actor con nivel.
    expect((await editar(idObjetivo, { rol: 'Administrador' })).status).toBe(200);
  });

  it('reenviar el rol que ya tiene no sube el contador', async () => {
    // Misma razón que el estado: el formulario manda el campo siempre.
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Administrador' });
    expect(r.status).toBe(200);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes);
  });

  it('un usuario Inactivo tambien ve su rol cambiado con corte de sesion', async () => {
    // No hay cortocircuito por estar Inactivo. Si lo hubiera, el camino de
    // "desactivar, corregir el rol, reactivar" dejaría el token viejo vivo en el
    // medio, que es una ventana real: la cuenta está Inactivo, pero si alguien la
    // reactiva sin volver a tocar el rol, el token emitido cuando era
    // Administrador vuelve a servir.
    const versionAntes = await tokenVersionDe(idObjetivo);

    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);
    expect((await editar(idObjetivo, { rol: 'Profesor' })).status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.estado).toBe('Inactivo');
    expect(fila.id_rol).toBe(await idRolDe('Profesor'));
    // Dos cambios reales en dos requests: dos incrementos, no uno.
    expect(fila.token_version).toBe(versionAntes + 2);

    // Se deja como Profesor Inactivo a propósito: el resto de la suite no lo usa
    // como actor y el cleanup borra la fila.
  });
});

describe('F1.5.2 — el corte de sesion es atomico con el cambio', () => {
  it('un cambio de rol toca `usuario` con un unico UPDATE', async () => {
    // Esto es lo que separa la implementación nueva de la anterior. Con dos
    // statements hay un instante —real, entre las dos consultas— en que el rol
    // nuevo ya está en la base y `token_version` todavía es el viejo: el token que
    // afirma el rol anterior sigue autorizando durante esa ventana. No es un
    // problema teórico, es lo que pasa si el segundo statement falla.
    //
    // Contar statements es la forma honesta de comprobarlo: un test que solo
    // mirara el contador final pasaría igual con la implementación de dos pasos.
    const updates = [];
    const escucha = (q) => {
      if (/^\s*update\s+"usuario"/i.test(q.sql)) updates.push(q.sql);
    };
    knex.on('query', escucha);

    try {
      const r = await editar(idObjetivo, { rol: 'Administrador' });
      expect(r.status).toBe(200);
    } finally {
      knex.off('query', escucha);
    }

    expect(updates).toHaveLength(1);
    // Y el contador no viaja como un valor calculádo afuera: se sube en la propia
    // query, para que dos admins editando al mismo tiempo no se pisen el uno al
    // otro con un read-modify-write.
    expect(updates[0]).toMatch(/token_version/i);
  });

  it('un guardado de perfil no toca el contador', async () => {
    const antes = await tokenVersionDe(idObjetivo);
    const r = await editar(idObjetivo, { nombre: 'Nombre Sin Importancia' });
    expect(r.status).toBe(200);
    expect(await tokenVersionDe(idObjetivo)).toBe(antes);
  });
});

describe('F1.5.1 — nadie se desactiva a si mismo', () => {
  it('el Administrador que se desactiva recibe 409 y sigue activo', async () => {
    // Por qué hace falta: el login bloquea al Inactivo, así que desactivar la
    // propia cuenta es un cierre de sesión sin vuelta —no hay botón de
    // "reactivar la mia" porque no se puede llegar a la pantalla—. En una
    // instalación con una sola cuenta administrativa, un clic de más deja el
    // sistema sin nadie que lo administre, y el único arreglo es un `UPDATE` a
    // mano en la base.
    //
    // No es un permiso sobre los demás: desactivar a terceros sigue igual de
    // permitido, que es lo que hace falta.
    const versionAntes = await tokenVersionDe(idAdmin);

    const r = await editar(idAdmin, { estado: 'Inactivo' });
    expect(r.status).toBe(409);

    // Contrapruebas: el rechazo tiene que ser de verdad, no un 409 de adorno que
    // igual escribió la columna.
    expect(await estadoDe(idAdmin)).toBe('Activo');
    expect(await tokenVersionDe(idAdmin)).toBe(versionAntes);

    // Y el actor sigue pudiendo trabajar: si el 409 lo hubiera expulsado de su
    // propia sesión, el estado quedaría a medio camino de un problema más grave.
    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(me.status).toBe(200);
  });

  it('pero sí puede activar y desactivar a otro', async () => {
    // La contraprueba del caso anterior, para que el guard no se lea al revés como
    // "no se puede cambiar el estado de nadie".
    expect((await editar(idObjetivo, { estado: 'Activo' })).status).toBe(200);
    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);
    expect((await editar(idObjetivo, { estado: 'Activo' })).status).toBe(200);
  });
});

describe('F1.5 — la bitacora distingue lo que corta sesion', () => {
  const ultimoRegistro = async (tipoAccion, idUsuario) => {
    const r = await dbQuery(
      `SELECT tipo_accion, id_usuario, detalle FROM bitacora
        WHERE tipo_accion = $1
          AND detalle::jsonb->>'entityId' = $2
        ORDER BY id_bitacora DESC LIMIT 1`,
      [tipoAccion, String(idUsuario)]
    );
    return r.rows[0];
  };

  it('la desactivacion tiene entrada propia', async () => {
    // Antes de F1.5 el estado no se podia cambiar, así que no había nada que
    // registrar. Ahora es la acción que le dice a un auditor "esta persona dejó de
    // tener acceso", y mezclada en un `ACTUALIZAR_USUARIO` sería indistinguible de
    // un cambio de nombre.
    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);

    const fila = await ultimoRegistro('CAMBIAR_ESTADO_USUARIO', idObjetivo);
    expect(fila).toBeDefined();
    expect(fila.detalle).toMatch(/sesion_cortada/);
    expect(fila.detalle).toMatch(/estado/);
    // El actor es el admin, no la cuenta afectada: `detalle->>'entityId'` es el
    // objetivo y `id_usuario` es quien lo hizo.
    expect(fila.id_usuario).not.toBe(idObjetivo);
  });

  it('el cambio de rol tambien', async () => {
    expect((await editar(idObjetivo, { rol: 'SuperAdmin' })).status).toBe(200);

    const fila = await ultimoRegistro('CAMBIAR_ROL_USUARIO', idObjetivo);
    expect(fila).toBeDefined();
    expect(fila.detalle).toMatch(/sesion_cortada/);
  });

  it('un guardado que no cambia nada queda como edicion de perfil', async () => {
    // Sin esto, un `PUT` inofensivo se registraría con `sesion_cortada` y la
    // bitácora empezaría a mentir sobre cuántas sesiones se cortaron de verdad.
    expect((await editar(idObjetivo, { nombre: 'Otro Nombre' })).status).toBe(200);

    const r = await dbQuery(
      `SELECT tipo_accion, detalle FROM bitacora
        WHERE detalle::jsonb->>'entityId' = $1
        ORDER BY id_bitacora DESC LIMIT 1`,
      [String(idObjetivo)]
    );
    expect(r.rows[0].tipo_accion).toBe('ACTUALIZAR_USUARIO');
    // `bitacoraService.log` mete `entity`/`entityId` en el detalle, así que nunca
    // es `null` para una edición de usuario. Lo que se comprueba es que no diga
    // que se cortó una sesión.
    expect(r.rows[0].detalle).not.toMatch(/sesion_cortada/);
  });
});