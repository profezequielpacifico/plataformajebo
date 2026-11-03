const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe, cookiesDe } = require('../helpers/cookies');

/**
 * Cambiar la contraseña de un usuario tiene que cerrar sus sesiones abiertas.
 *
 * El síntoma que motivó esto no es un error visible sino una laguna: `PUT
 * /users/:id` con `password` rehashea y listo, sin tocar `token_version`. Los
 * tokens ya emitidos seguían valiendo —el access hasta su expiración (1 h) y el
 * refresh se podía renovar durante 7 días—, así que cambiar la contraseña desde
 * la pantalla de Usuarios no revocaba nada. Para un alumno al que se le cambia
 * la clave porque se perdió el documento, la cuenta quedaba desprotegida hasta
 * que venciera el token, y el refresh la mantenía viva mientras tanto.
 *
 * El mecanismo ya existía: `token_version` viaja en el token como `ver` y
 * `auth.service.refresh` lo compara contra la fila. Lo que faltaba era dispararlo
 * desde el cambio de contraseña, que ahora llama a
 * `tokenRevocacion.invalidarTodo`.
 *
 * La segunda mitad de la suite es el otro lado de la misma regla: una edición
 * que NO toca la contraseña, el rol ni el estado no puede cortar la sesión. Si el
 * `token_version` se subiera siempre, corregir el nombre de un usuario expulsaría a
 * esa persona de los equipos que tiene abiertos.
 *
 * F1.5 agrandó el conjunto de cambios que cortan sesión. Antes era solo la
 * contraseña; ahora también el rol y el estado, porque los tres escriben algo que
 * el token afirma y la base no: qué permisos tiene, y si la cuenta sirve. Un
 * token que dice "Administrador" sobre una base que dice "Árbitro" es una
 * discrepancia que no puede tener un ganador legítimo. El detalle de por qué el
 * contador sube en el mismo `UPDATE` y no en un segundo está en
 * `UsuarioRepository.actualizarSeguridad`; los casos de estado y las combinaciones
 * Admin↔SuperAdmin están en `usuario-rol-estado-sesion.test.js`.
 *
 * Los tests corren en orden y van cambiando la contraseña del usuario objetivo,
 * de eso depende `PASSWORD_VIGENTE`. Es intencionado: el estado es la secuencia
 * (login → cambio → renovación) y separarlo en `it` independientes exigiría un
 * `beforeEach` que reconstruyera la misma escena sin probar nada.
 */

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;
const PASA = (email) => `${email}_${TAG}@jebo.test`;

const EMAIL_ADMIN = PASA('admin');
const EMAIL_OBJETIVO = PASA('sesion');
const PASSWORD_INICIAL = contrasenaDePrueba();

let tokenAdmin;
let idObjetivo;
let idRolAdmin;

/** La contraseña que el usuario objetivo tiene puesta en este momento. */
let PASSWORD_VIGENTE = PASSWORD_INICIAL;

const tokenVersionDe = async (id) => {
  const r = await dbQuery('SELECT token_version FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].token_version;
};

/** Login del objetivo: 200 con cookies, listas para `refresh`. */
const sesionDe = async (password) => {
  const login = await request(app).post('/auth/login').send({ email: EMAIL_OBJETIVO, password });
  expect(login.status).toBe(200);
  return login;
};

const refrescar = (loginRes) => request(app).post('/auth/refresh').set(cookiesDe(loginRes)).send();

const cambiarPasswordDesdeAdmin = (password) =>
  request(app)
    .put(`/users/${idObjetivo}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ password });

beforeAll(async () => {
  const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Administrador'");
  idRolAdmin = rol.rows[0].id_rol;

  const crear = async (nombre, email, documento, password) => {
    const hash = await bcrypt.hash(password, 4);
    const ins = await dbQuery(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
       VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
      [nombre, email, hash, idRolAdmin, documento]
    );
    return ins.rows[0].id_usuario;
  };

  idObjetivo = await crear('Objetivo Sesion', EMAIL_OBJETIVO, '90000211', PASSWORD_INICIAL);

  const passAdmin = contrasenaDePrueba();
  await crear('Administrador Prueba', EMAIL_ADMIN, '90000210', passAdmin);

  const login = await request(app).post('/auth/login').send({ email: EMAIL_ADMIN, password: passAdmin });
  expect(login.status).toBe(200);
  tokenAdmin = accessTokenDe(login);
});

afterAll(async () => {
  // `bitacora` y `refresh_token_revocado` tienen clave foránea a `usuario`: se
  // borran las filas que los apuntan antes de borrar al usuario.
  // En `bitacora` hay dos punteros distintos y no son el mismo: `id_usuario` es
  // QUIEN hizo la acción (el admin) y el usuario afectado queda en
  // `detalle->>'entityId'`. Por eso el LIKE tiene que aparecer en los dos lados
  // o quedan filas apuntando a un admin que ya se borró.
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

describe('Cambio de contraseña: cierra las sesiones del usuario', () => {
  it('un refresh emitido antes del cambio ya no renueva', async () => {
    const sesionVieja = await sesionDe(PASSWORD_VIGENTE);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const nueva = contrasenaDePrueba();
    const cambio = await cambiarPasswordDesdeAdmin(nueva);
    expect(cambio.status).toBe(200);
    PASSWORD_VIGENTE = nueva;

    // Lo que se corta es la renovacion. El access ya emitido sigue sirviendo
    // hasta que expira (1 h), porque su validez la decide la firma y no la base:
    // sin consulta por request no se puede matar antes. Por eso la prueba mira el
    // refresh, que es la puerta de entrada a una sesion nueva sin escribir la
    // contrasena otra vez.
    const renovacion = await refrescar(sesionVieja);
    expect(renovacion.status).toBe(401);
    expect(renovacion.body.error).toMatch(/cerrada/i);

    expect(await tokenVersionDe(idObjetivo)).toBeGreaterThan(versionAntes);
  });

  it('con la contrasena nueva se entra, y con la vieja no', async () => {
    // Contraprueba del anterior: si el corte fuera total y dejara la cuenta
    // inservible, el usuario se quedaria sin poder entrar nunca.
    const sesionNueva = await sesionDe(PASSWORD_VIGENTE);
    expect((await refrescar(sesionNueva)).status).toBe(200);

    const conVieja = await request(app)
      .post('/auth/login')
      .send({ email: EMAIL_OBJETIVO, password: PASSWORD_INICIAL });
    expect(conVieja.status).toBe(401);
    expect(conVieja.body.error).toMatch(/credenciales/i);
  });

  it('el corte queda asentado en la bitacora', async () => {
    const nueva = contrasenaDePrueba();
    const cambio = await cambiarPasswordDesdeAdmin(nueva);
    expect(cambio.status).toBe(200);
    PASSWORD_VIGENTE = nueva;

    // El cambio de contrasena es la accion mas sensible que un administrador
    // puede hacer sobre otra cuenta, y antes se registraba como un
    // `ACTUALIZAR_USUARIO` indistinguible de un cambio de nombre.
    //
    // El filtro va por `detalle->>'entityId'` y NO por `bitacora.id_usuario`: esa
    // columna es el actor (el admin que hizo el cambio), no la cuenta
    // afectada. Buscar por `id_usuario = idObjetivo` daria siempre cero filas y
    // el test pasaria por el motivo equivocado.
    const fila = await dbQuery(
      `SELECT tipo_accion, id_usuario, detalle FROM bitacora
        WHERE tipo_accion = 'CAMBIAR_PASSWORD_USUARIO'
          AND detalle::jsonb->>'entityId' = $1
        ORDER BY id_bitacora DESC LIMIT 1`,
      [String(idObjetivo)]
    );

    expect(fila.rows).toHaveLength(1);
    expect(fila.rows[0].detalle).toMatch(/sesion_cortada/);
    // Y el actor es el admin, que es lo que permite reconstruir "quién lo hizo".
    expect(fila.rows[0].id_usuario).not.toBe(idObjetivo);
  });
});

describe('Edicion sin cambio de contrasena: no cierra la sesion', () => {
  it('corregir el nombre no expulsa al usuario de sus sesiones', async () => {
    const sesion = await sesionDe(PASSWORD_VIGENTE);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const edicion = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Nombre Corregido' });
    expect(edicion.status).toBe(200);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes);
    expect((await refrescar(sesion)).status).toBe(200);
  });

  it('cambiar el rol ahora SI corta la sesion (F1.5.2)', async () => {
    // Este test invertia su propia afirmacion. La version anterior de F1.5 fijaba
    // aca que un cambio de rol NO cortaba la sesion, y lo hacia a proposito: el
    // rol viaja embebido en el token y `authenticate` no consulta la base, asi que
    // degradar a un Administrador a Arbitro le dejaba el panel de admin hasta que
    // su access venciera —hasta 1 hora—.
    //
    // F1.5.2 cerro esa ventana. Un token que dice "Administrador" y una base que
    // ya dice "Arbitro" son dos verdades incompatibles, y la que gana no puede ser
    // la que se emitio antes. El mecanismo es el mismo que ya usaba el cambio de
    // contrasena: `token_version` viaja en el token como `ver` y el refresh lo
    // compara contra la fila. Lo que cambio es que ahora sube en el MISMO `UPDATE`
    // que escribe el rol, asi que no hay instante en que exista esa discrepancia.
    //
    // La contraprueba importante es la de al lado: corregir el nombre NO corta la
    // sesion. Si esto cortara, el mismo razonamiento de "el token esta viejo"
    // expulsaria a medio mundo por un tilde mal puesto.
    const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Profesor'");
    const versionAntes = await tokenVersionDe(idObjetivo);

    // Sesion emitida con el rol VIEJO. Es la que tiene que morir.
    const sesionVieja = await sesionDe(PASSWORD_VIGENTE);

    const cambio = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'Profesor' });
    expect(cambio.status).toBe(200);

    const fila = await dbQuery('SELECT id_rol FROM usuario WHERE id_usuario = $1', [idObjetivo]);
    expect(fila.rows[0].id_rol).toBe(rol.rows[0].id_rol);
    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes + 1);

    // Y no solo sube el contador: el token viejo efectivamente deja de renovar.
    expect((await refrescar(sesionVieja)).status).toBe(401);

    // Volver a Administrador para que el resto de la suite no dependa del rol.
    const volver = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'Administrador' });
    expect(volver.status).toBe(200);
  });
});