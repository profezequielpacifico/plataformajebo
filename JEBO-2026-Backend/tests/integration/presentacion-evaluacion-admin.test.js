const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const TAG = 'gym-hoja';
const sufijo = crypto.randomBytes(4).toString('hex');

let tokenAdmin;
let tokenJuez1;
let tokenJuez2;
let tokenJuez3;
let tokenJuezFuera;
let tokenArbitro;
let idPresentacion;
let idPresentacionSinJurado;
let idEquipo;
let idAdmin;
let idJuez1;
let idJuez2;
let idJuez3;
let idLocalidad;
let idDistrito;
let idTorneo;
let idDisciplinaEvaluacion;
let idRolJuez;

const hoja = (valor) => ({
  coord_1: valor, coord_2: valor, coord_3: valor, coord_4: valor,
  desem_1: valor, desem_2: valor, desem_3: valor, desem_4: valor
});

const crearUsuario = async (sufijoRol, idRol, prefijoDoc) => {
  const pass = contrasenaDePrueba();
  const hash = await bcrypt.hash(pass, 4);
  const email = `${TAG}-${sufijoRol}-${sufijo}@jebo.test`;

  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [`Gym Hoja ${sufijoRol} ${sufijo}`, email, hash, idRol, `${prefijoDoc}${sufijo.slice(0, 4)}`]
  );
  const login = await request(app).post('/auth/login').send({ email, password: pass });
  expect(login.status).toBe(200);
  return { id: ins.rows[0].id_usuario, token: accessTokenDe(login) };
};

const guardar = (token, payload) =>
  request(app)
    .post(`/presentaciones/${idPresentacion}/evaluaciones`)
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

beforeAll(async () => {
  const rol = await dbQuery(`INSERT INTO rol (descripcion) VALUES ('Juez') RETURNING id_rol`);
  idRolJuez = rol.rows[0].id_rol;
  const roles = await dbQuery('SELECT id_rol, descripcion FROM rol');
  const idRolAdmin = roles.rows.find((r) => r.descripcion === 'Administrador').id_rol;
  const idRolArbitro = roles.rows.find((r) => r.descripcion === 'Arbitro').id_rol;

  const admin = await crearUsuario('admin', idRolAdmin, '95');
  tokenAdmin = admin.token;
  idAdmin = admin.id;
  const juez1 = await crearUsuario('juez-1', idRolJuez, '93');
  const juez2 = await crearUsuario('juez-2', idRolJuez, '92');
  const juez3 = await crearUsuario('juez-3', idRolJuez, '91');
  tokenJuez1 = juez1.token;
  tokenJuez2 = juez2.token;
  tokenJuez3 = juez3.token;
  idJuez1 = juez1.id;
  idJuez2 = juez2.id;
  idJuez3 = juez3.id;
  tokenJuezFuera = (await crearUsuario('juez-fuera', idRolJuez, '90')).token;
  tokenArbitro = (await crearUsuario('arbitro', idRolArbitro, '89')).token;

  const loc = await dbQuery('SELECT id_localidad, id_distrito FROM localidad ORDER BY id_localidad LIMIT 1');
  idLocalidad = loc.rows[0].id_localidad;
  idDistrito = loc.rows[0].id_distrito;
  const inst = await dbQuery('SELECT id_instancia FROM instancia ORDER BY id_instancia LIMIT 1');

  const disc = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion, tipo_competencia)
     VALUES ($1, 'Reglamento de prueba', 3, $2, 'EVALUACION') RETURNING id_disciplina`,
    [`${TAG} disciplina ${sufijo}`, `Disciplina de la suite de hoja ${sufijo}`]
  );
  idDisciplinaEvaluacion = disc.rows[0].id_disciplina;

  const torneo = await dbQuery(
    `INSERT INTO torneo (id_disciplina, nombre, fecha_inicio, fecha_fin, estado)
     VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 'Activo') RETURNING id_torneo`,
    [idDisciplinaEvaluacion, `${TAG} torneo ${sufijo}`]
  );
  idTorneo = torneo.rows[0].id_torneo;

  const insti = await dbQuery(
    `INSERT INTO institucion (nombre, tipo, direccion, telefono, id_distrito, id_localidad)
     VALUES ($1, 'Escuela', $2, '0000000', $3, $4) RETURNING id_institucion`,
    [`${TAG} inst ${sufijo}`, `${TAG} calle`, idDistrito, idLocalidad]
  );
  await dbQuery('INSERT INTO usuario_institucion (id_usuario, id_institucion) VALUES ($1, $2)', [
    admin.id, insti.rows[0].id_institucion
  ]);

  const equipo = await dbQuery(
    `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario, id_distrito, id_localidad)
     VALUES ($1, '#000000', $2, $3, $4, $5, $6) RETURNING id_equipo`,
    [`${TAG} trio ${sufijo}`, insti.rows[0].id_institucion, idDisciplinaEvaluacion, admin.id, idDistrito, idLocalidad]
  );
  idEquipo = equipo.rows[0].id_equipo;

  const creada = await request(app)
    .post('/presentaciones')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      id_torneo: idTorneo,
      id_disciplina: idDisciplinaEvaluacion,
      orden: 1,
      participantes: [{ id_equipo: idEquipo, rol: 'GRUPO', orden_salida: 1 }],
      staff: [
        { id_usuario: juez1.id, rol: 'JUEZ_PRESIDENTE' },
        { id_usuario: juez2.id, rol: 'JUEZ' },
        { id_usuario: juez3.id, rol: 'JUEZ' }
      ]
    });
  expect(creada.status).toBe(201);
  idPresentacion = creada.body.id_presentacion;

  await dbQuery(`UPDATE presentacion SET estado = 'EN_CURSO' WHERE id_presentacion = $1`, [idPresentacion]);

  for (const token of [tokenJuez1, tokenJuez2, tokenJuez3]) {
    const res = await guardar(token, { id_participante_equipo: idEquipo, ...hoja(5) });
    expect(res.status).toBe(200);
  }
});

afterAll(async () => {
  await dbQuery('DELETE FROM presentacion WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM configuracion_puntaje WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM torneo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM usuario_institucion WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM institucion WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM disciplina WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM rol WHERE descripcion = $1', ['Juez']);
});

describe('Hoja de evaluación de una presentación', () => {
  it('deja cargar la hoja a un juez del jurado', async () => {
    const res = await guardar(tokenJuez1, { id_participante_equipo: idEquipo, ...hoja(5) });

    expect(res.status).toBe(200);
    expect(res.body.coord_1).toBe(5);
    expect(res.body.id_juez).toBe(idJuez1);
  });

  it('deja cargar la hoja al administrador aunque no figure en el jurado', async () => {
    const res = await guardar(tokenAdmin, { id_participante_equipo: idEquipo, ...hoja(1) });

    expect(res.status).toBe(200);
    expect(res.body.coord_1).toBe(1);

    const filas = await dbQuery(
      `SELECT id_juez, coord_1 FROM evaluacion
       WHERE id_presentacion = $1 AND id_participante_equipo = $2`,
      [idPresentacion, idEquipo]
    );
    expect(filas.rowCount).toBe(4);
    expect(filas.rows.map((f) => f.id_juez).sort((a, b) => a - b))
      .toEqual([idAdmin, idJuez1, idJuez2, idJuez3].sort((a, b) => a - b));
    expect(filas.rows.find((f) => f.id_juez === idAdmin).coord_1).toBe(1);
  });

  it('el promedio oficial no incluye la hoja del administrador', async () => {
    await guardar(tokenAdmin, { id_participante_equipo: idEquipo, ...hoja(1) });

    const res = await request(app)
      .get(`/presentaciones/${idPresentacion}/resultado`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.resultado).toHaveLength(1);
    expect(Number(res.body.resultado[0].puntaje_promedio)).toBe(40);
    expect(Number(res.body.resultado[0].jueces_count)).toBe(3);
  });

  it('la hoja del administrador no altera el cierre de la presentación', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idPresentacion}/validar-cierre`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(true);
    expect(res.body.errores).toEqual([]);
  });

  it('rechaza a un juez que no está en el jurado de esta presentación', async () => {
    const res = await guardar(tokenJuezFuera, { id_participante_equipo: idEquipo, ...hoja(2) });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no eres juez/i);
  });

  it('rechaza a un usuario que no es juez ni administrador', async () => {
    const res = await guardar(tokenArbitro, { id_participante_equipo: idEquipo, ...hoja(2) });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/juez/i);
  });
});

describe('F1.5.3 — la identidad del juez sale del token, no de la query', () => {
  beforeAll(async () => {
    expect((await guardar(tokenJuez1, { id_participante_equipo: idEquipo, ...hoja(1) })).status).toBe(200);
    expect((await guardar(tokenJuez2, { id_participante_equipo: idEquipo, ...hoja(2) })).status).toBe(200);
  });

  const leer = (token, query = '') =>
    request(app)
      .get(`/presentaciones/${idPresentacion}/evaluaciones${query}`)
      .set('Authorization', `Bearer ${token}`);

  it('devuelve la hoja del juez que pregunta', async () => {
    const res = await leer(tokenJuez1);
    expect(res.status).toBe(200);

    const ids = res.body.map((e) => e.id_juez);
    expect(ids).toContain(idJuez1);
    expect(ids).not.toContain(idJuez2);
  });

  it('un ?id_juez= con el id de otro juez se ignora', async () => {
    const engañado = await leer(tokenJuez1, `?id_juez=${idJuez2}`);
    expect(engañado.status).toBe(200);

    const ids = engañado.body.map((e) => e.id_juez);
    expect(ids).toContain(idJuez1);
    expect(ids).not.toContain(idJuez2);
    expect(engañado.body[0].coord_1).toBe(1);
  });

  it('lo mismo si el id viene con basura en vez de un entero', async () => {
    const basura = await leer(tokenJuez1, '?id_juez=abc');
    expect(basura.status).toBe(200);
    expect(basura.body.map((e) => e.id_juez)).not.toContain(idJuez2);
  });

  it('un Arbitro tampoco puede pedir la hoja de un juez', async () => {
    const res = await leer(tokenArbitro);
    expect(res.status).toBe(403);
  });

  it('al administrador le devuelve su propia hoja, no la de un juez', async () => {
    const res = await leer(tokenAdmin, `?id_juez=${idJuez1}`);
    expect(res.status).toBe(200);

    const ids = res.body.map((e) => e.id_juez);
    expect(ids).not.toContain(idJuez1);
    expect(ids).not.toContain(idJuez2);
    expect(ids.every((id) => id === idAdmin)).toBe(true);
  });
});

describe('Presentaciones cargadas sin jurado (datos de SQL)', () => {
  beforeAll(async () => {
    const creada = await request(app)
      .post('/presentaciones')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        id_torneo: idTorneo,
        id_disciplina: idDisciplinaEvaluacion,
        orden: 2,
        participantes: [{ id_equipo: idEquipo, rol: 'GRUPO', orden_salida: 1 }],
        staff: []
      });
    expect(creada.status).toBe(201);
    idPresentacionSinJurado = creada.body.id_presentacion;

    await dbQuery(`UPDATE presentacion SET estado = 'EN_CURSO' WHERE id_presentacion = $1`, [idPresentacionSinJurado]);

    await dbQuery(
      `INSERT INTO evaluacion (id_presentacion, id_participante_equipo, id_juez,
         coord_1, coord_2, coord_3, coord_4, desem_1, desem_2, desem_3, desem_4)
       VALUES ($1, $2, $3, 5,5,5,5,5,5,5,5), ($1, $2, $4, 3,3,3,3,3,3,3,3)`,
      [idPresentacionSinJurado, idEquipo, idJuez1, idJuez2]
    );
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM presentacion WHERE id_presentacion = $1', [idPresentacionSinJurado]);
  });

  it('su resultado sigue saliendo en la vista aunque no tenga jurado cargado', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idPresentacionSinJurado}/resultado`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.resultado).toHaveLength(1);
    expect(Number(res.body.resultado[0].puntaje_promedio)).toBe(32);
  });
});

describe('Visibilidad de los encuentros por rol', () => {
  const crear = (token, payload) =>
    request(app).post('/presentaciones').set('Authorization', `Bearer ${token}`).send(payload);

  const base = (idTorneo, orden, staff) => ({
    id_torneo: idTorneo,
    id_disciplina: idDisciplinaEvaluacion,
    orden,
    participantes: [{ id_equipo: idEquipo, rol: 'GRUPO', orden_salida: 1 }],
    staff
  });

  const listar = (token, query = '') =>
    request(app)
      .get(`/presentaciones${query}`)
      .set('Authorization', `Bearer ${token}`);

  let idOtroJurado;
  let idComoSecretario;
  let idTorneoAjeno;
  let idEnOtroTorneo;

  beforeAll(async () => {
    const otroJurado = await crear(tokenAdmin, base(idTorneo, 3, [
      { id_usuario: idJuez3, rol: 'JUEZ_PRESIDENTE' },
      { id_usuario: idJuez2, rol: 'JUEZ' }
    ]));
    expect(otroJurado.status).toBe(201);
    idOtroJurado = otroJurado.body.id_presentacion;

    const comoSecretario = await crear(tokenAdmin, base(idTorneo, 4, [
      { id_usuario: idJuez1, rol: 'SECRETARIO' },
      { id_usuario: idJuez2, rol: 'JUEZ' }
    ]));
    expect(comoSecretario.status).toBe(201);
    idComoSecretario = comoSecretario.body.id_presentacion;

    const inst = await dbQuery('SELECT id_instancia FROM instancia ORDER BY id_instancia LIMIT 1');
    const torneoAjeno = await dbQuery(
      `INSERT INTO torneo (id_disciplina, nombre, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE + 30, 'Activo') RETURNING id_torneo`,
      [idDisciplinaEvaluacion, `${TAG} torneo ajeno ${sufijo}`]
    );
    idTorneoAjeno = torneoAjeno.rows[0].id_torneo;

    const enOtroTorneo = await crear(tokenAdmin, base(idTorneoAjeno, 1, [
      { id_usuario: idJuez1, rol: 'JUEZ_PRESIDENTE' }
    ]));
    expect(enOtroTorneo.status).toBe(201);
    idEnOtroTorneo = enOtroTorneo.body.id_presentacion;
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM presentacion WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  });

  it('el juez ve solo los encuentros donde figura en el jurado', async () => {
    const res = await listar(tokenJuez1);

    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id_presentacion);
    expect(ids).toContain(idPresentacion);
    expect(ids).toContain(idEnOtroTorneo);
    expect(ids).not.toContain(idOtroJurado);
    expect(ids).not.toContain(idComoSecretario);
    expect(ids).not.toContain(idPresentacionSinJurado);
  });

  it('el filtro por torneo se combina con el filtro por jurado', async () => {
    const ajeno = await listar(tokenJuez1, `?id_torneo=${idTorneoAjeno}`);
    const propio = await listar(tokenJuez1, `?id_torneo=${idTorneo}`);

    expect(ajeno.status).toBe(200);
    expect(ajeno.body.map((p) => p.id_presentacion)).toEqual([idEnOtroTorneo]);

    expect(propio.status).toBe(200);
    expect(propio.body.map((p) => p.id_presentacion)).toEqual([idPresentacion]);
  });

  it('el administrador sigue viendo la jornada completa', async () => {
    const res = await listar(tokenAdmin);

    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id_presentacion);
    expect(ids).toContain(idPresentacion);
    expect(ids).toContain(idOtroJurado);
    expect(ids).toContain(idComoSecretario);
    expect(ids).toContain(idEnOtroTorneo);
  });

  it('un rol que no es administrador ni juez sigue sin ver el listado', async () => {
    const res = await listar(tokenArbitro);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/rol/i);
  });

  it('un juez no puede cambiar el estado de un encuentro', async () => {
    const res = await request(app)
      .patch(`/presentaciones/${idOtroJurado}/estado`)
      .set('Authorization', `Bearer ${tokenJuez1}`)
      .send({ estado: 'CANCELADA' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/rol/i);

    const fila = await dbQuery(
      'SELECT estado FROM presentacion WHERE id_presentacion = $1',
      [idOtroJurado]
    );
    expect(fila.rows[0].estado).toBe('PROGRAMADA');
  });

  it('un juez no puede dar de alta, editar ni eliminar un encuentro', async () => {
    const alta = await crear(tokenJuez1, base(idTorneo, 5, [{ id_usuario: idJuez1, rol: 'JUEZ' }]));
    const edicion = await request(app)
      .put(`/presentaciones/${idOtroJurado}`)
      .set('Authorization', `Bearer ${tokenJuez1}`)
      .send(base(idTorneo, 3, [{ id_usuario: idJuez1, rol: 'JUEZ' }]));
    const baja = await request(app)
      .delete(`/presentaciones/${idOtroJurado}`)
      .set('Authorization', `Bearer ${tokenJuez1}`);

    expect(alta.status).toBe(403);
    expect(edicion.status).toBe(403);
    expect(baja.status).toBe(403);

    const siguen = await dbQuery(
      'SELECT id_presentacion FROM presentacion WHERE id_presentacion = $1',
      [idOtroJurado]
    );
    expect(siguen.rowCount).toBe(1);
  });

  it('un juez entra a la hoja de un encuentro donde esta en el jurado', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idPresentacion}/detalle-evaluacion`)
      .set('Authorization', `Bearer ${tokenJuez1}`);

    expect(res.status).toBe(200);
    expect(res.body.currentUserId).toBe(idJuez1);
  });

  it('un juez no entra a la hoja de un encuentro donde no esta en el jurado', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idOtroJurado}/detalle-evaluacion`)
      .set('Authorization', `Bearer ${tokenJuez1}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no eres juez/i);
  });

  it('el administrador entra a la hoja de un encuentro que no organiza', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idOtroJurado}/detalle-evaluacion`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.currentUserId).toBe(idAdmin);
  });
});