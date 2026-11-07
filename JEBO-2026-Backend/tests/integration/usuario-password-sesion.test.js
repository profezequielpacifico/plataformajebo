const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe, cookiesDe } = require('../helpers/cookies');

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;
const PASA = (email) => `${email}_${TAG}@jebo.test`;

const EMAIL_ADMIN = PASA('admin');
const EMAIL_OBJETIVO = PASA('sesion');
const PASSWORD_INICIAL = contrasenaDePrueba();

let tokenAdmin;
let idObjetivo;
let idRolAdmin;

let PASSWORD_VIGENTE = PASSWORD_INICIAL;

const tokenVersionDe = async (id) => {
  const r = await dbQuery('SELECT token_version FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].token_version;
};

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

    const renovacion = await refrescar(sesionVieja);
    expect(renovacion.status).toBe(401);
    expect(renovacion.body.error).toMatch(/cerrada/i);

    expect(await tokenVersionDe(idObjetivo)).toBeGreaterThan(versionAntes);
  });

  it('con la contrasena nueva se entra, y con la vieja no', async () => {
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

    const fila = await dbQuery(
      `SELECT tipo_accion, id_usuario, detalle FROM bitacora
        WHERE tipo_accion = 'CAMBIAR_PASSWORD_USUARIO'
          AND detalle::jsonb->>'entityId' = $1
        ORDER BY id_bitacora DESC LIMIT 1`,
      [String(idObjetivo)]
    );

    expect(fila.rows).toHaveLength(1);
    expect(fila.rows[0].detalle).toMatch(/sesion_cortada/);
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
    const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Profesor'");
    const versionAntes = await tokenVersionDe(idObjetivo);

    const sesionVieja = await sesionDe(PASSWORD_VIGENTE);

    const cambio = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'Profesor' });
    expect(cambio.status).toBe(200);

    const fila = await dbQuery('SELECT id_rol FROM usuario WHERE id_usuario = $1', [idObjetivo]);
    expect(fila.rows[0].id_rol).toBe(rol.rows[0].id_rol);
    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes + 1);

    expect((await refrescar(sesionVieja)).status).toBe(401);

    const volver = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'Administrador' });
    expect(volver.status).toBe(200);
  });
});