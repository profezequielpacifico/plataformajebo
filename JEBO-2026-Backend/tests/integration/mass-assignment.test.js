const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const { contrasenaDePrueba, hashInyectado } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const crypto = require('crypto');

// Sufijo unico por corrida para las filas que crea esta suite. Todas las
// limpiezas de las demas suites filtran por `nombre LIKE '<tag>%'`, asi que una
// fila con este nombre no puede ser alcanzada por un cleanup ajeno.
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
      // id_usuario tiene que estar en el SELECT: se usa para armar la URL del
      // PUT. Sin esta columna la peticion sale como /users/undefined.
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

      // El campo legitimo del allowlist si se aplica...
      expect(after.rows[0].nombre).toBe('Renombrado');
      // ...y los que no estan en el allowlist se descartan en silencio.
      expect(after.rows[0].password_hash).toBe(before.rows[0].password_hash);
      expect(after.rows[0].id_rol).toBe(before.rows[0].id_rol);
    });

    it('no permite cambiar la contrasena escribiendo el hash directamente', async () => {
      const target = await dbQuery('SELECT id_usuario, password_hash FROM usuario WHERE email = $1', [EMAIL]);

      const login = await request(app)
        .post('/auth/login')
        .send({ email: EMAIL, password: PASS });

      // La contrasena real sigue funcionando: el hash inyectado no la piso.
      expect(login.status).toBe(200);
      // Y ademas: la credencial ya no esta en el cuerpo. Con el token en el
      // body, `httpOnly` no compra nada, porque el token sigue disponible para
      // cualquier script de la pagina via `response.data.accessToken`.
      expect(login.body.data.accessToken).toBeUndefined();
      expect(login.body.data.refreshToken).toBeUndefined();
      expect(accessTokenDe(login)).toBeTruthy();
      expect(target.rows[0].password_hash).not.toBe('HASH_INYECTADO');
    });
  });

  describe('PUT /matches/:id', () => {
    // El partido es de esta suite y de nadie más.
    //
    // Antes se tomaba `SELECT ... FROM partido JOIN torneo LIMIT 1`, o sea el
    // primero que hubiera, que es una fila compartida con todas las demás
    // suites. `aislamiento-institucion` borra sus partidos y sus torneos en el
    // `afterAll`, y `partido.id_equipo_*` tiene `ON DELETE CASCADE`: si el
    // `LIMIT 1` elegía una de esas filas, el partido desaparecía ENTRE las dos
    // SELECT de la aserción y el test reventaba con un `TypeError` sobre
    // `undefined`. Pasaba una de cada diez corridas, según el orden en que
    // Jest repartiera los workers, y el error señalaba la aserción cuando el
    // problema era de aislamiento.
    //
    // La disciplina también es de esta suite. No se puede tomar prestada: el
    // trigger `partido_requiere_marcador` rechaza los partidos de un torneo cuya
    // disciplina es de tipo `EVALUACION`, y en la base de test las únicas que
    // quedan son de ese tipo (las que dejaron `presentacion-alta`). Con una
    // disciplina ajena el INSERT del partido falla, y con el select prestado el
    // test no se enteraba: el `return` de abajo lo salteaba en silencio.
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
        // Sin estructura minima no hay partido posible. Se deja `idPartido` en
        // null y los tests se saltan, en vez de fallar por una base vacía.
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
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2, $3)
         RETURNING id_torneo`,
        [`${TAG} mass torneo`, idDisciplina, inst.rows[0].id_instancia]
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
      // El orden lo fija la base: `partido.id_torneo` no tiene cascada y
      // `torneo.id_disciplina` tampoco, así que hay que bajar de hoja en hoja.
      await dbQuery('DELETE FROM partido WHERE id_partido = $1', [idPartido]);
      await dbQuery('DELETE FROM torneo WHERE id_torneo = $1', [idTorneo]);
      if (equipos.length) {
        await dbQuery('DELETE FROM equipo WHERE id_equipo = ANY($1::int[])', [equipos]);
      }
      await dbQuery('DELETE FROM disciplina WHERE id_disciplina = $1', [idDisciplina]);
    });

    // Devolver `undefined` cuando la fixture no se pudo armar haría que estos
    // tests PASEN sin comprobar nada, que es como este bloque se comportaba
    // antes: se salteaba solo cuando la base no tenía partidos, y fallaba con
    // un `TypeError` cuando otra suite le había dejado uno. Si `beforeAll` no
    // pudo construir el partido, hay que decirlo.
    const partidoDeLaSuite = () => {
      expect(idPartido).toBeDefined();
      return idPartido;
    };

    it('descarta id_partido, creado_en y resultado_cargado', async () => {
      const id = partidoDeLaSuite();

      // `creado_en` tiene que estar tambien en el SELECT de "antes". Comparar
      // contra una columna que no se pidio es comparar un timestamp contra
      // `undefined`: el test pasaba por otra via.
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

      // id_rol=1 (Administrador) venia en el body y fue descartado: el rol
      // efectivo es el que corresponde al nombre 'Profesor'.
      expect(creado.rows[0].id_rol).toBe(profesor.rows[0].id_rol);

      await dbQuery('DELETE FROM usuario WHERE documento = $1', [documento]);
    });
  });
});
