const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const sufijo = crypto.randomBytes(6).toString('hex');
const TAG = `gymalt_${sufijo}`;

let tokenAdmin;
let idDisciplinaEvaluacion;
let idTorneo;
let idEquipoA;
let idEquipoB;
let idJuez;
let idLocalidad;
let idDistrito;

const crearUsuarioAdmin = async () => {
  const pass = contrasenaDePrueba();
  const hash = await bcrypt.hash(pass, 4);
  const rol = await dbQuery("SELECT id_rol FROM rol WHERE descripcion = 'Administrador'");
  const email = `${TAG}@jebo.test`;
  const doc = `97${sufijo.slice(0, 4)}`;

  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [`Gym Alt ${sufijo}`, email, hash, rol.rows[0].id_rol, doc]
  );
  const login = await request(app).post('/auth/login').send({ email, password: pass });
  expect(login.status).toBe(200);
  return { token: accessTokenDe(login), id: ins.rows[0].id_usuario };
};

beforeAll(async () => {
  const admin = await crearUsuarioAdmin();
  tokenAdmin = admin.token;

  const loc = await dbQuery(
    'SELECT id_localidad, id_distrito FROM localidad ORDER BY id_localidad LIMIT 1'
  );
  idLocalidad = loc.rows[0].id_localidad;
  idDistrito = loc.rows[0].id_distrito;

  const disc = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion, tipo_competencia)
     VALUES ($1, 'Reglamento de prueba', 3, $2, 'EVALUACION') RETURNING id_disciplina`,
    [`${TAG} disciplina`, `Disciplina de la suite de alta ${sufijo}`]
  );
  idDisciplinaEvaluacion = disc.rows[0].id_disciplina;

  const inst = await dbQuery('SELECT id_instancia FROM instancia ORDER BY id_instancia LIMIT 1');

  const torneo = await dbQuery(
    `INSERT INTO torneo (id_disciplina, nombre, fecha_inicio, fecha_fin, estado)
     VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 'Activo') RETURNING id_torneo`,
    [idDisciplinaEvaluacion, `${TAG} torneo`]
  );
  idTorneo = torneo.rows[0].id_torneo;

  const idUsuarioDueño = admin.id;

  const insti = await dbQuery(
    `INSERT INTO institucion (nombre, tipo, direccion, telefono, id_distrito, id_localidad)
     VALUES ($1, 'Escuela', $2, '0000000', $3, $4) RETURNING id_institucion`,
    [`${TAG} inst`, `${TAG} calle`, idDistrito, idLocalidad]
  );
  await dbQuery(
    'INSERT INTO usuario_institucion (id_usuario, id_institucion) VALUES ($1, $2)',
    [idUsuarioDueño, insti.rows[0].id_institucion]
  );

  const crearEquipo = async (nombre) => {
    const r = await dbQuery(
      `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario, id_distrito, id_localidad)
       VALUES ($1, '#000000', $2, $3, $4, $5, $6)
       RETURNING id_equipo`,
      [nombre, insti.rows[0].id_institucion, idDisciplinaEvaluacion, idUsuarioDueño, idDistrito, idLocalidad]
    );
    return r.rows[0].id_equipo;
  };

  idEquipoA = await crearEquipo(`${TAG} trio A`);
  idEquipoB = await crearEquipo(`${TAG} trio B`);

  idJuez = idUsuarioDueño;
});

afterAll(async () => {
  await dbQuery('DELETE FROM presentacion WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM configuracion_puntaje WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM torneo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM usuario_institucion WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM institucion WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM disciplina WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery(
    'DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [`${TAG}%`]
  );
  await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [`${TAG}%`]);
});

const crear = (payload) =>
  request(app)
    .post('/presentaciones')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(payload);

const base = (orden, equipo = idEquipoA) => ({
  id_torneo: idTorneo,
  id_disciplina: idDisciplinaEvaluacion,
  orden,
  participantes: [{ id_equipo: equipo, rol: 'GRUPO', orden_salida: 1 }],
  staff: [{ id_usuario: idJuez, rol: 'JUEZ_PRESIDENTE' }]
});

describe('Alta de presentaciones (POST /presentaciones)', () => {
  it('crea la presentación con su trío y su jurado', async () => {
    const res = await crear(base(1));

    expect(res.status).toBe(201);
    expect(res.body.id_presentacion).toBeDefined();
    expect(res.body.estado).toBe('PROGRAMADA');
  });

  it('el listado trae la presentación recién creada con sus agregados', async () => {
    const res = await request(app)
      .get(`/presentaciones?id_torneo=${idTorneo}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    const creada = (Array.isArray(res.body) ? res.body : res.body.data || []).find((p) => p.orden === 1);
    expect(creada).toBeDefined();
    expect(creada.equipo_nombre).toBe(`${TAG} trio A`);
    expect(creada.torneo_nombre).toBe(`${TAG} torneo`);
  });

  it('rechaza un orden repetido en el mismo torneo', async () => {
    const res = await crear(base(1));

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Ya existe una presentaci/);
  });

  it('acepta un orden distinto en el mismo torneo', async () => {
    const res = await crear(base(2, idEquipoB));

    expect(res.status).toBe(201);
  });

  it('rechaza una presentación con más de un trío', async () => {
    const res = await crear({
      ...base(3),
      participantes: [
        { id_equipo: idEquipoA, rol: 'GRUPO', orden_salida: 1 },
        { id_equipo: idEquipoB, rol: 'GRUPO', orden_salida: 2 }
      ]
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/un solo trío/);

    const huerfanas = await dbQuery(
      'SELECT count(*)::int AS n FROM presentacion WHERE id_torneo = $1 AND orden = 3', [idTorneo]
    );
    expect(huerfanas.rows[0].n).toBe(0);
  });

  it('no deja agregar un segundo trío a una presentación que ya tiene uno', async () => {
    const creada = await crear(base(4, idEquipoB));
    expect(creada.status).toBe(201);

    await expect(dbQuery(
      `INSERT INTO presentacion_participante (id_presentacion, id_equipo, rol, orden_salida)
       VALUES ($1, $2, 'GRUPO', 1)`,
      [creada.body.id_presentacion, idEquipoA]
    )).rejects.toThrow(/Cada encuentro es de un solo trio/);
  });

  it('no acepta un orden de salida distinto de 1', async () => {
    const creada = await crear({ ...base(5), participantes: [] });
    expect(creada.status).toBe(201);

    await expect(dbQuery(
      `INSERT INTO presentacion_participante (id_presentacion, id_equipo, rol, orden_salida)
       VALUES ($1, $2, 'GRUPO', 3)`,
      [creada.body.id_presentacion, idEquipoB]
    )).rejects.toThrow(/orden_salida_unico/);
  });

  it('no deja la presentación a medio crear si un paso del medio falla', async () => {
    const antes = await dbQuery(
      'SELECT count(*)::int AS n FROM presentacion WHERE id_torneo = $1', [idTorneo]
    );

    const res = await crear({
      ...base(6),
      staff: [{ id_usuario: 999999, rol: 'JUEZ' }]
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const despues = await dbQuery(
      'SELECT count(*)::int AS n FROM presentacion WHERE id_torneo = $1', [idTorneo]
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);

    const huerfanos = await dbQuery(
      `SELECT count(*)::int AS n FROM presentacion_participante pp
        WHERE pp.id_presentacion NOT IN (SELECT id_presentacion FROM presentacion)`
    );
    expect(huerfanos.rows[0].n).toBe(0);
  });

  it('rechaza una disciplina que no sea de evaluación', async () => {
    const marcador = await dbQuery(
      `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion)
       VALUES ($1, 'Reglamento', 11, $2) RETURNING id_disciplina`,
      [`${TAG} marcador`, 'Disciplina de marcador']
    );

    const res = await crear({ ...base(7), id_disciplina: marcador.rows[0].id_disciplina });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/EVALUACION/);
  });

  it('un alta sin token no crea nada', async () => {
    const antes = await dbQuery(
      'SELECT count(*)::int AS n FROM presentacion WHERE id_torneo = $1', [idTorneo]
    );

    const res = await request(app).post('/presentaciones').send(base(8));

    expect(res.status).toBe(401);
    const despues = await dbQuery(
      'SELECT count(*)::int AS n FROM presentacion WHERE id_torneo = $1', [idTorneo]
    );
    expect(despues.rows[0].n).toBe(antes.rows[0].n);
  });
});
