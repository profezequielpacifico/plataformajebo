const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

/**
 * `POST /teams`: el alta propia del Profesor y sus reglas.
 *
 * Hasta ahora el alta era `requireAdminOrAbove` mientras el formulario de
 * "Alta de Equipo" ya se mostraba al Profesor en el dashboard: el boton
 * existia y la API lo rechazaba con 403. El guard paso a
 * `gestionarEquipoPropio` (en el alta sin `:id` alcanza con el nivel: la fila
 * todavia no existe) y las reglas viven en `equipo.service.create`:
 *
 *  1. El equipo queda a nombre del Profesor que lo crea, aunque el body mande
 *     otro `id_usuario`: si el dueno lo eligiera el que teclea, las reglas de
 *     mas abajo se saltarian con un id ajeno.
 *  2. Solo en una institucion que ya es suya (`usuario_institucion`). El
 *     formulario ya llega recortado por alcance (X-05), pero el backend no se
 *     apoya en el cliente para el tenant.
 *  3. Maximo 3 equipos y nombre unico entre los suyos. Aplica por DUENIO, no
 *     por quien teclea: un Administrador tampoco pasa el limite a nombre de un
 *     Profesor.
 *
 * Es extremo a extremo a proposito: guard de la ruta, servicio y repositorio
 * son una sola regla, y un test de servicio que se armara el `req` a mano
 * pasaria con el cable entre las tres piezas desconectado.
 */

const sufijo = crypto.randomBytes(6).toString('hex');
const TAG = `altaprof_${sufijo}`;

const ROL = {
  ADMIN: 'Administrador',
  PROFESOR: 'Profesor',
  ARBITRO: 'Arbitro'
};

let idDisciplina;
let instPropia;
let instAjena;

const profesor = {};
const profesorSinInstitucion = {};
const otroProfesor = {};
const admin = {};
const arbitro = {};

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  if (!r.rows[0]) {
    throw new Error(`El rol "${descripcion}" no existe en la base de test`);
  }
  return r.rows[0].id_rol;
};

const crearUsuarioConToken = async (rol) => {
  const email = `${TAG}_${crypto.randomBytes(4).toString('hex')}@jebo.test`;
  const pass = contrasenaDePrueba();
  const hash = await bcrypt.hash(pass, 4);
  const documento = `${sufijo.slice(0, 6)}${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}${rol.slice(0, 2)}`;
  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [`AltaProfesor ${rol}`, email, hash, await idRolDe(rol), documento]
  );
  const login = await request(app).post('/auth/login').send({ email, password: pass });
  expect(login.status).toBe(200);
  return { id: ins.rows[0].id_usuario, token: accessTokenDe(login), email };
};

const alta = (token, body) =>
  request(app).post('/teams').set('Authorization', `Bearer ${token}`).send(body);

const cuerpoDe = (nombre, extra = {}) => ({
  nombre: `${TAG} ${nombre}`,
  id_institucion: instPropia,
  id_disciplina: idDisciplina,
  ...extra
});

const duenioDe = async (nombre) => {
  const r = await dbQuery('SELECT id_usuario FROM equipo WHERE nombre = $1', [`${TAG} ${nombre}`]);
  return r.rows[0] ? Number(r.rows[0].id_usuario) : null;
};

const creados = async () => {
  const r = await dbQuery('SELECT count(*) AS total FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  return Number(r.rows[0].total);
};

beforeAll(async () => {
  const loc = await dbQuery('SELECT id_localidad, id_distrito FROM localidad ORDER BY id_localidad LIMIT 1');
  const idLocalidad = loc.rows[0].id_localidad;
  const idDistrito = loc.rows[0].id_distrito;

  const disc = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion)
     VALUES ($1, 'Reglamento de prueba', 11, $2) RETURNING id_disciplina`,
    [`${TAG} disciplina`, `Disciplina de la suite de alta-profesor ${sufijo}`]
  );
  idDisciplina = disc.rows[0].id_disciplina;

  const crearInstitucion = async (nombre) => {
    const r = await dbQuery(
      `INSERT INTO institucion (nombre, tipo, direccion, telefono, id_distrito, id_localidad)
       VALUES ($1, 'Escuela', $2, '0000000', $3, $4) RETURNING id_institucion`,
      [nombre, `${TAG} calle ${sufijo}`, idDistrito, idLocalidad]
    );
    return r.rows[0].id_institucion;
  };

  instPropia = await crearInstitucion(`${TAG} propia`);
  instAjena = await crearInstitucion(`${TAG} ajena`);

  Object.assign(profesor, await crearUsuarioConToken(ROL.PROFESOR));
  Object.assign(profesorSinInstitucion, await crearUsuarioConToken(ROL.PROFESOR));
  Object.assign(otroProfesor, await crearUsuarioConToken(ROL.PROFESOR));
  Object.assign(admin, await crearUsuarioConToken(ROL.ADMIN));
  Object.assign(arbitro, await crearUsuarioConToken(ROL.ARBITRO));

  // Solo `profesor` pertenece a `instPropia`; los otros dos Profesores quedan
  // deliberadamente sin institucion para cubrir las dos caras de la regla.
  await dbQuery(
    'INSERT INTO usuario_institucion (id_usuario, id_institucion) VALUES ($1, $2)',
    [profesor.id, instPropia]
  );
});

afterAll(async () => {
  // El orden lo impone la FK: `usuario_institucion` cuelga de `usuario` e
  // `institucion`, y `bitacora` de `usuario`. Sin este orden el cleanup aborta
  // y la suite deja fixtures colgadas en la base de test.
  await dbQuery('DELETE FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery(
    'DELETE FROM usuario_institucion WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [`${TAG}%`]
  );
  await dbQuery('DELETE FROM institucion WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM disciplina WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery(
    'DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [`${TAG}%`]
  );
  await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [
    `${TAG}%`
  ]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [`${TAG}%`]);
});

describe('POST /teams: el alta propia del Profesor', () => {
  it('1) sin token no hay alta', async () => {
    const res = await request(app).post('/teams').send(cuerpoDe('Sin token'));
    expect(res.status).toBe(401);
    expect(await creados()).toBe(0);
  });

  it('2) el Árbitro no da de alta equipos', async () => {
    const res = await alta(arbitro.token, cuerpoDe('Del arbitro'));
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Profesor/);
    expect(await creados()).toBe(0);
  });

  it('3) el Profesor no puede elegir una institución que no es suya', async () => {
    const res = await alta(profesor.token, cuerpoDe('De otra institucion', { id_institucion: instAjena }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Solo podés crear equipos en tu institución/);
    expect(await creados()).toBe(0);
  });

  it('4) el Profesor sin institución asignada no puede dar de alta', async () => {
    const res = await alta(profesorSinInstitucion.token, cuerpoDe('Sin institucion'));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/No tenés una institución asignada/);
    expect(await creados()).toBe(0);
  });

  it('5) el Profesor da de alta su equipo y el dueño es él, aunque mande id_usuario ajeno', async () => {
    const res = await alta(profesor.token, cuerpoDe('Halcones', { id_usuario: otroProfesor.id }));
    expect(res.status).toBe(201);
    expect(await duenioDe('Halcones')).toBe(profesor.id);
  });

  it('6) el nombre no se repite entre sus equipos, ni siquiera cambiando mayúsculas', async () => {
    const res = await alta(profesor.token, cuerpoDe('HALCONES'));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/los nombres no pueden repetirse/);
    expect(await creados()).toBe(1);
  });

  it('7) la segunda y la tercera alta con nombre distinto pasan', async () => {
    const segunda = await alta(profesor.token, cuerpoDe('Toros'));
    expect(segunda.status).toBe(201);

    const tercera = await alta(profesor.token, cuerpoDe('Aguilas'));
    expect(tercera.status).toBe(201);
    expect(await creados()).toBe(3);
  });

  it('8) la cuarta alta está bloqueada por el máximo de 3', async () => {
    const res = await alta(profesor.token, cuerpoDe('Condores'));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/No podés tener más de 3 equipos/);
    expect(await creados()).toBe(3);
  });

  it('9) el Administrador sigue dando de alta equipos sin límite', async () => {
    const res = await alta(admin.token, cuerpoDe('Del administrador'));
    expect(res.status).toBe(201);
    expect(await duenioDe('Del administrador')).toBe(admin.id);
  });

  it('10) el límite es del dueño: ni el Administrador pasa el 4.º equipo a nombre de ese Profesor', async () => {
    const antes = await creados();
    const res = await alta(admin.token, cuerpoDe('Otro del profesor', { id_usuario: profesor.id }));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Un profesor no puede tener más de 3 equipos/);
    expect(await creados()).toBe(antes);
  });

  it('11) el Administrador sí puede dar de alta un equipo a nombre de otro Profesor sin equipos', async () => {
    const res = await alta(admin.token, cuerpoDe('De otro profesor', { id_usuario: otroProfesor.id }));
    expect(res.status).toBe(201);
    expect(await duenioDe('De otro profesor')).toBe(otroProfesor.id);
  });
});
