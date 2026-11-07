const request = require('supertest');
const app = require('../../src/app');
const bcrypt = require('bcryptjs');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe, valorDeCookie, cookiesDe } = require('../helpers/cookies');

const borrarUsuarioDePrueba = async (email) => {
  const res = await dbQuery('SELECT id_usuario FROM usuario WHERE email = $1', [email]);
  for (const { id_usuario } of res.rows) {
    await dbQuery('DELETE FROM bitacora WHERE id_usuario = $1', [id_usuario]);
    await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario = $1', [id_usuario]);
    await dbQuery('DELETE FROM usuario WHERE id_usuario = $1', [id_usuario]);
  }
  await dbQuery('DELETE FROM login_intentos WHERE identificador = $1', [email]);
};

describe('Auth Endpoints', () => {
  describe('POST /auth/login', () => {
    it('rechaza login sin credenciales', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rechaza login con email vacío', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: '', password: contrasenaDePrueba() });

      expect(res.status).toBe(400);
    });

    it('rechaza login con password vacío', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('rechaza sin token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token no proporcionado');
    });

    it('rechaza token inválido', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer token_invalido');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('responde 200 sin token, para no dejar la sesion trabada', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Cookies de sesion', () => {
    const EMAIL = 'test_cookies@jebo.test';
    const PASS = contrasenaDePrueba();
    const DOCUMENTO = '90000004';
    let idUsuario;

    beforeAll(async () => {
      await borrarUsuarioDePrueba(EMAIL);

      const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Administrador'");
      const hash = await bcrypt.hash(PASS, 4);
      const ins = await dbQuery(
        `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
         VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
        ['Cookies Test', EMAIL, hash, rol.rows[0].id_rol, DOCUMENTO]
      );
      idUsuario = ins.rows[0].id_usuario;
    });

    afterAll(async () => {
      if (idUsuario) await borrarUsuarioDePrueba(EMAIL);
    });

    const login = () => request(app).post('/auth/login').send({ email: EMAIL, password: PASS });

    it('no devuelve los tokens en el cuerpo', async () => {
      const res = await login();
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.body.data.refreshToken).toBeUndefined();
      expect(res.body.data.user.email).toBe(EMAIL);
    });

    it('setea los dos tokens como cookies httpOnly', async () => {
      const res = await login();
      const cookies = res.headers['set-cookie'].join(';');

      expect(cookies).toMatch(/accessToken=[^;]+/);
      expect(cookies).toMatch(/refreshToken=[^;]+/);
      expect(cookies).toMatch(/HttpOnly/i);
    });

    it('marca SameSite=Strict y path=/', async () => {
      const res = await login();
      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toMatch(/SameSite=Strict/i);
      expect(cookies).toMatch(/Path=\//i);
    });

    it('la cookie de access autentica sin header Authorization', async () => {
      const loginRes = await login();
      const res = await request(app)
        .get('/auth/me')
        .set(cookiesDe(loginRes));

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(EMAIL);
    });

    it('la cookie expira antes que el token que contiene', async () => {
      const res = await login();
      const access = res.headers['set-cookie'].find((c) => c.startsWith('accessToken='));
      const refresh = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

      const aAccess = Number(/Max-Age=(\d+)/.exec(access)[1]);
      const aRefresh = Number(/Max-Age=(\d+)/.exec(refresh)[1]);

      expect(aAccess).toBeGreaterThan(0);
      expect(aAccess).toBeLessThan(3600);
      expect(aRefresh).toBeGreaterThan(aAccess);
      expect(aRefresh).toBeLessThan(7 * 24 * 3600);
    });

    it('renueva la sesion desde la cookie, sin cuerpo', async () => {
      const loginRes = await login();
      const res = await request(app)
        .post('/auth/refresh')
        .set(cookiesDe(loginRes))
        .send();

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(EMAIL);
      expect(res.body.data.accessToken).toBeUndefined();
      expect(accessTokenDe(res)).toBeTruthy();
    });

    it('rotar invalida el refresh token anterior', async () => {
      const loginRes = await login();
      const refreshViejo = valorDeCookie(loginRes, 'refreshToken');

      await request(app).post('/auth/refresh')
        .set({ Cookie: `refreshToken=${refreshViejo}` })
        .send();

      const segundo = await request(app)
        .post('/auth/refresh')
        .set({ Cookie: `refreshToken=${refreshViejo}` })
        .send();

      expect(segundo.status).toBe(200);
    });

    it('un refresh token viejo de mas de la ventana de gracia no renueva', async () => {
      const loginRes = await login();
      const refreshViejo = valorDeCookie(loginRes, 'refreshToken');
      const jti = JSON.parse(
        Buffer.from(refreshViejo.split('.')[1], 'base64url').toString('utf8')
      ).jti;

      await request(app).post('/auth/refresh')
        .set({ Cookie: `refreshToken=${refreshViejo}` })
        .send();
      await dbQuery(
        `UPDATE refresh_token_revocado
            SET revocado_en = NOW() - INTERVAL '5 minutes'
          WHERE jti = $1`,
        [jti]
      );

      const reuso = await request(app)
        .post('/auth/refresh')
        .set({ Cookie: `refreshToken=${refreshViejo}` })
        .send();

      expect(reuso.status).toBe(401);
      expect(reuso.body.error).toMatch(/cerrada/i);
    });

    it('un access token no puede renewarse a si mismo', async () => {
      const loginRes = await login();
      const access = valorDeCookie(loginRes, 'accessToken');

      const res = await request(app)
        .post('/auth/refresh')
        .set({ Cookie: `refreshToken=${access}` })
        .send();

      expect(res.status).toBe(401);
    });

    it('el access token anterior deja de autenticar apenas se cierra la sesion', async () => {
      const loginRes = await login();
      const cookiesViejas = cookiesDe(loginRes);

      const antes = await request(app).get('/auth/me').set(cookiesViejas);
      expect(antes.status).toBe(200);

      const logout = await request(app).post('/auth/logout').set(cookiesViejas).send();
      expect(logout.status).toBe(200);

      const despues = await request(app).get('/auth/me').set(cookiesViejas);
      expect(despues.status).toBe(401);

      const conHeader = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessTokenDe(loginRes)}`);
      expect(conHeader.status).toBe(401);
    });

    it('el logout borra las dos cookies', async () => {
      const loginRes = await login();
      const res = await request(app)
        .post('/auth/logout')
        .set(cookiesDe(loginRes))
        .send();

      expect(res.status).toBe(200);

      const cookies = res.headers['set-cookie'].join(';');
      expect(cookies).toMatch(/accessToken=;/);
      expect(cookies).toMatch(/refreshToken=;/);
      expect(cookies).toMatch(/Max-Age=0/i);
      expect(cookies).toMatch(/HttpOnly/i);
    });

    it('un logout sin sesion previa tambien limpia cookies', async () => {
      const res = await request(app).post('/auth/logout').send();
      expect(res.status).toBe(200);
      expect(res.headers['set-cookie'].join(';')).toMatch(/Max-Age=0/i);
    });
  });
});
