const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const { accessTokenDe } = require('../helpers/cookies');

const EMAIL = 'test_admin@jebo.test';
const PASS = 'test-only-not-a-real-password';
const DOCUMENTO = '90000001';

const EMAIL_SUPERADMIN = 'test_superadmin@jebo.test';
const DOCUMENTO_SUPERADMIN = '90000005';

const tokenDe = async (email, password = PASS) => {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password });
  return accessTokenDe(response);
};

const get_auth_token = async () => tokenDe(EMAIL);

const dejarUsuarioEnRol = async ({ nombre, email, documento, rol }) => {
  const fila = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [rol]);
  let idRol = fila.rows[0] && fila.rows[0].id_rol;
  if (!idRol) {
    const inserted = await dbQuery('INSERT INTO rol (descripcion) VALUES ($1) RETURNING id_rol', [rol]);
    idRol = inserted.rows[0].id_rol;
  }

  const hash = await bcrypt.hash(PASS, 4);
  const existing = await dbQuery(
    'SELECT id_usuario FROM usuario WHERE documento = $1 OR email = $2',
    [documento, email]
  );

  if (existing.rows.length) {
    await dbQuery(
      `UPDATE usuario
          SET nombre = $1, email = $2, password_hash = $3, id_rol = $4, estado = 'Activo'
        WHERE id_usuario = $5`,
      [nombre, email, hash, idRol, existing.rows[0].id_usuario]
    );
  } else {
    await dbQuery(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
       VALUES ($1, $2, $3, $4, 'Activo', $5)`,
      [nombre, email, hash, idRol, documento]
    );
  }
};

describe('Territorial API', () => {
  let token;
  let tokenSuperAdmin;

  beforeAll(async () => {
    await dejarUsuarioEnRol({
      nombre: 'Admin JEBO',
      email: EMAIL,
      documento: DOCUMENTO,
      rol: 'Administrador'
    });
    await dejarUsuarioEnRol({
      nombre: 'SuperAdmin JEBO',
      email: EMAIL_SUPERADMIN,
      documento: DOCUMENTO_SUPERADMIN,
      rol: 'SuperAdmin'
    });

    token = await get_auth_token();
    tokenSuperAdmin = await tokenDe(EMAIL_SUPERADMIN);
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM localidad WHERE nombre LIKE \'Localidad Test%\'');
  });

  describe('POST /localities', () => {
    it('debería crear una localidad exitosamente', async () => {
      const data = {
        nombre: 'Localidad Test' + Date.now(),
        id_distrito: 1,
        id_region: 1
      };

      const response = await request(app)
        .post('/localities')
        .set('Authorization', `Bearer ${tokenSuperAdmin}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id_localidad');
    });

    it('un Administrador ya no crea una localidad: 403', async () => {
      const response = await request(app)
        .post('/localities')
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Localidad Test' + Date.now(), id_distrito: 1, id_region: 1 });

      expect(response.status).toBe(403);
    });

    it('leer el padron sigue abierto a cualquier autenticado', async () => {
      const response = await request(app)
        .get('/localities')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });
});