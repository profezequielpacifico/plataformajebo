const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;
const PASA = (email) => `${email}_${TAG}@jebo.test`;

const EMAIL_ADMIN = PASA('admin');
const EMAIL_OBJETIVO = PASA('objetivo');
const EMAIL_INGRESO = PASA('ingreso');
const PASSWORD_INGRESO = contrasenaDePrueba();

const ROL_EXTRA = `Delegado_${TAG}`;

let tokenAdmin;
let idObjetivo;
let idRolExtra;
let idRolAdmin;

const usuariosPorEmail = async (email) =>
  dbQuery(
    'SELECT id_usuario, email FROM usuario WHERE lower(email) = lower($1) ORDER BY id_usuario',
    [email]
  );

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0] && r.rows[0].id_rol;
};

const crearUsuario = async ({ nombre, email, documento, rol, password }) => {
  const hash = await bcrypt.hash(password, 4);
  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [nombre, email, hash, rol, documento]
  );
  return ins.rows[0].id_usuario;
};

beforeAll(async () => {
  idRolAdmin = await idRolDe('Administrador');
  idRolExtra = await idRolDe(ROL_EXTRA);
  if (!idRolExtra) {
    const ins = await dbQuery('INSERT INTO rol (descripcion) VALUES ($1) RETURNING id_rol', [ROL_EXTRA]);
    idRolExtra = ins.rows[0].id_rol;
  }

  idObjetivo = await crearUsuario({
    nombre: 'Usuario Objetivo',
    email: EMAIL_OBJETIVO,
    documento: '90000112',
    rol: idRolAdmin,
    password: contrasenaDePrueba()
  });

  await crearUsuario({
    nombre: 'Usuario Ingreso',
    email: EMAIL_INGRESO,
    documento: '90000113',
    rol: idRolAdmin,
    password: PASSWORD_INGRESO
  });

  const passAdmin = contrasenaDePrueba();
  await crearUsuario({
    nombre: 'Administrador Prueba',
    email: EMAIL_ADMIN,
    documento: '90000111',
    rol: idRolAdmin,
    password: passAdmin
  });

  const login = await request(app).post('/auth/login').send({ email: EMAIL_ADMIN, password: passAdmin });
  expect(login.status).toBe(200);
  tokenAdmin = accessTokenDe(login);
});

afterAll(async () => {
  await dbQuery('DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [
    SUFIJO
  ]);
  await dbQuery(
    'DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [SUFIJO]
  );
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [SUFIJO]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [SUFIJO]);
  await dbQuery('DELETE FROM rol WHERE descripcion = $1', [ROL_EXTRA]);
});

describe('Usuarios: el email identifica a una sola persona', () => {
  it('rechaza el alta de un segundo usuario con el mismo email en otra caja', async () => {
    const response = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Gemela',
        email: EMAIL_OBJETIVO.toUpperCase(),
        documento: '90000114',
        rol: 'Profesor',
        password: contrasenaDePrueba()
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/email ya existe/i);
    expect((await usuariosPorEmail(EMAIL_OBJETIVO)).rows).toHaveLength(1);
  });

  it('editar un usuario no crea otro, aunque el email venga en otra caja', async () => {
    const response = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ email: EMAIL_OBJETIVO.toUpperCase() });

    expect(response.status).toBe(200);
    const filas = await usuariosPorEmail(EMAIL_OBJETIVO);
    expect(filas.rows).toHaveLength(1);
    expect(filas.rows[0].id_usuario).toBe(idObjetivo);
    expect(filas.rows[0].email).toBe(EMAIL_OBJETIVO);
  });

  it('cambiar la contraseña de otro usuario no crea un usuario nuevo', async () => {
    const nueva = contrasenaDePrueba();
    const response = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ password: nueva, email: EMAIL_OBJETIVO });

    expect(response.status).toBe(200);
    expect((await usuariosPorEmail(EMAIL_OBJETIVO)).rows).toHaveLength(1);

    const login = await request(app)
      .post('/auth/login')
      .send({ email: EMAIL_OBJETIVO, password: nueva });
    expect(login.status).toBe(200);
    expect(login.body.data.user.id_usuario).toBe(idObjetivo);
  });

  it('el login entra con el email en cualquier caja y devuelve esa misma cuenta', async () => {
    const login = await request(app)
      .post('/auth/login')
      .send({ email: EMAIL_INGRESO.toUpperCase(), password: PASSWORD_INGRESO });

    expect(login.status).toBe(200);
    const filas = await usuariosPorEmail(EMAIL_INGRESO);
    expect(login.body.data.user.id_usuario).toBe(filas.rows[0].id_usuario);
  });

  it('el registro no acepta una cuenta gemela con el email en otra caja', async () => {
    const response = await request(app).post('/auth/register').send({
      nombre: 'Gemela Registrada',
      email: EMAIL_OBJETIVO.toUpperCase(),
      documento: '90000115',
      password: contrasenaDePrueba()
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/email ya existe/i);
    expect((await usuariosPorEmail(EMAIL_OBJETIVO)).rows).toHaveLength(1);
  });

  it('la base sola impide la cuenta gemela, aunque se escriba por SQL', async () => {
    let error = null;
    try {
      await crearUsuario({
        nombre: 'Gemela Directa',
        email: EMAIL_OBJETIVO.toUpperCase(),
        documento: '90000116',
        rol: idRolAdmin,
        password: contrasenaDePrueba()
      });
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
    expect(error.code).toBe('23505');
    expect((await usuariosPorEmail(EMAIL_OBJETIVO)).rows).toHaveLength(1);
  });
});

describe('Usuarios: el rol se valida contra la tabla rol', () => {
  it('acepta un rol que existe en la tabla aunque no estuviera en la lista de la ruta', async () => {
    const response = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Delegado Nuevo',
        email: PASA('delegado'),
        documento: '90000117',
        rol: ROL_EXTRA,
        password: contrasenaDePrueba()
      });

    expect(response.status).toBe(201);
    const creado = await dbQuery('SELECT id_rol FROM usuario WHERE documento = $1', ['90000117']);
    expect(creado.rows[0].id_rol).toBe(idRolExtra);
  });

  it('deja cambiar el rol de un usuario a uno que existe en la tabla', async () => {
    const response = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: ROL_EXTRA });

    expect(response.status).toBe(200);
    const actualizado = await dbQuery('SELECT id_rol FROM usuario WHERE documento = $1', ['90000112']);
    expect(actualizado.rows[0].id_rol).toBe(idRolExtra);
  });

  it('rechaza un rol que la lista de la ruta admitía pero no existe en la tabla', async () => {
    const response = await request(app)
      .post('/users')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: 'Editor Inventado',
        email: PASA('editor'),
        documento: '90000118',
        rol: 'Editor',
        password: contrasenaDePrueba()
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/rol inválido/i);
  });

  it('el mensaje dice qué roles hay, para que el error sea accionable', async () => {
    const response = await request(app)
      .put(`/users/${idObjetivo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ rol: 'Inventado' });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain(ROL_EXTRA);
  });
});