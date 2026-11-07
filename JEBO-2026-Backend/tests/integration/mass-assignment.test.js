const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const { contrasenaDePrueba, hashInyectado } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const crypto = require('crypto');

const TAG = crypto.randomBytes(4).toString('hex');

const EMAIL = 'test_massassign@jebo.test';
const PASS = contrasenaDePrueba();
const DOCUMENTO = '90000002';

const getToken = async () => {
  const response = await request(app)
    .post('/auth/login')
    .send({ email: EMAIL, password: PASS });
  return accessTokenDe(response);
};

describe('Mass assignment', () => {
  let token;

  beforeAll(async () => {
    const role = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Administrador'");
    const idRol = role.rows[0].id_rol;
    const hash = await bcrypt.hash(PASS, 4);

    const existing = await dbQuery(
      'SELECT id_usuario FROM usuario WHERE documento = $1 OR email = $2',
      [DOCUMENTO, EMAIL]
    );
    if (existing.rows.length) {
      await dbQuery(
        `UPDATE usuario SET nombre = $1, email = $2, password_hash = $3, id_rol = $4, estado = 'Activo'
          WHERE id_usuario = $5`,
        ['Mass Assignment Test', EMAIL, hash, idRol, existing.rows[0].id_usuario]
      );
    } else {
      await dbQuery(
        `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
         VALUES ($1, $2, $3, $4, 'Activo', $5)`,
        ['Mass Assignment Test', EMAIL, hash, idRol, DOCUMENTO]
      );
    }

    token = await getToken();
  });

  describe('PUT /users/:id', () => {
    it('ignora password_hash enviado en el body', async () => {
      const before = await dbQuery(
        'SELECT id_usuario, password_hash, id_rol FROM usuario WHERE email = $1',
        [EMAIL]
      );

      await request(app)
        .put(`/users/${before.rows[0].id_usuario}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nombre: 'Renombrado', password_hash: hashInyectado(), id_rol: 999 });

      const after = await dbQuery(
        'SELECT password_hash, id_rol, nombre FROM usuario WHERE email = $1',
        [EMAIL]
      );

      expect(after.rows[0].nombre).toBe('Renombrado');
      expect(after.rows[0].password_hash).toBe(before.rows[0].password_hash);
      expect(after.rows[0].id_rol).toBe(before.rows[0].id_rol);
    });

    it('no permite cambiar la contrasena escribiendo el hash directamente', async () => {
      const target = await dbQuery('SELECT id_usuario, password_hash FROM usuario WHERE email = $1', [EMAIL]);

      const login = await request(app)
        .post('/auth/login')
        .send({ email: EMAIL, password: PASS });

      expect(login.status).toBe(200);
      expect(login.body.data.accessToken).toBeUndefined();
      expect(login.body.data.refreshToken).toBeUndefined();
      expect(accessTokenDe(login)).toBeTruthy();
      expect(target.rows[0].password_hash).not.toBe('HASH_INYECTADO');
    });
  });

  describe('PUT /matches/:id', () => {
    let idPartido;
    let idTorneo;
    let idDisciplina;
    const equipos = [];

    beforeAll(async () => {
      const [inst, insti, base] = await Promise.all([
        dbQuery('SELECT id_instancia FROM instancia ORDER BY id_instancia LIMIT 1'),
        dbQuery('SELECT id_institucion FROM institucion ORDER BY id_institucion LIMIT 1'),
        dbQuery('SELECT id_usuario FROM usuario WHERE email = $1', [EMAIL])
      ]);

      if (!inst.rows.length || !insti.rows.length || !base.rows.length) {
        return;
      }

      const d = await dbQuery(
        `INSERT INTO disciplina (nombre, tipo_competencia, jugadores_por_equipo)
         VALUES ($1, 'MARCADOR', 11) RETURNING id_disciplina`,
        [`${TAG} mass disciplina`]
      );
      idDisciplina = d.rows[0].id_disciplina;

      for (const sufijo of ['local', 'visitante']) {
        const e = await dbQuery(
          `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario)
           VALUES ($1, '#000000', $2, $3, $4) RETURNING id_equipo`,
          [`${TAG} mass ${sufijo}`, insti.rows[0].id_institucion, idDisciplina, base.rows[0].id_usuario]
        );
        equipos.push(e.rows[0].id_equipo);
      }

      const t = await dbQuery(
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2)
         RETURNING id_torneo`,
        [`${TAG} mass torneo`, idDisciplina]
      );
      idTorneo = t.rows[0].id_torneo;

      const p = await dbQuery(
        `INSERT INTO partido (id_torneo, id_equipo_local, id_equipo_visitante, estado)
         VALUES ($1, $2, $3, 'Pendiente') RETURNING id_partido`,
        [idTorneo, equipos[0], equipos[1]]
      );
      idPartido = p.rows[0].id_partido;
    });

    afterAll(async () => {
      if (!idTorneo) return;
      await dbQuery('DELETE FROM partido WHERE id_partido = $1', [idPartido]);
      await dbQuery('DELETE FROM torneo WHERE id_torneo = $1', [idTorneo]);
      if (equipos.length) {
        await dbQuery('DELETE FROM equipo WHERE id_equipo = ANY($1::int[])', [equipos]);
      }
      await dbQuery('DELETE FROM disciplina WHERE id_disciplina = $1', [idDisciplina]);
    });

    const partidoDeLaSuite = () => {
      expect(idPartido).toBeDefined();
      return idPartido;
    };

    it('descarta id_partido, creado_en y resultado_cargado', async () => {
      const id = partidoDeLaSuite();

      const antes = await dbQuery(
        'SELECT resultado_cargado, creado_en FROM partido WHERE id_partido = $1',
        [id]
      );

      await request(app)
        .put(`/matches/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          estado: 'Programado',
          resultado_cargado: true,
          id_partido: 999999,
          creado_en: '1999-01-01T00:00:00.000Z'
        });

      const despues = await dbQuery(
        'SELECT resultado_cargado, creado_en FROM partido WHERE id_partido = $1',
        [id]
      );

      expect(despues.rows[0].resultado_cargado).toBe(antes.rows[0].resultado_cargado);
      expect(despues.rows[0].creado_en).toEqual(antes.rows[0].creado_en);
    });

    it('rechaza un estado fuera de la lista permitida', async () => {
      const response = await request(app)
        .put(`/matches/${partidoDeLaSuite()}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'Inventado' });

      expect(response.status).toBe(400);
    });

  });

  describe('POST /users', () => {
    it('descarta id_rol del body y usa el rol resuelto por nombre', async () => {
      const documento = '90000003';
      const email = 'test_nuevo@jebo.test';

      const antes = await dbQuery(
        'SELECT id_usuario FROM usuario WHERE documento = $1 OR email = $2',
        [documento, email]
      );
      if (antes.rows.length) {
        await dbQuery('DELETE FROM usuario WHERE documento = $1', [documento]);
      }

      await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Usuario Nuevo',
          email,
          documento,
          password: contrasenaDePrueba(),
          rol: 'Profesor',
          id_rol: 1
        });

      const creado = await dbQuery('SELECT id_rol FROM usuario WHERE documento = $1', [documento]);
      const profesor = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Profesor'");

      expect(creado.rows[0].id_rol).toBe(profesor.rows[0].id_rol);

      await dbQuery('DELETE FROM usuario WHERE documento = $1', [documento]);
    });
  });
});
