const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

/**
 * `POST /teams/enroll-batch`: el permiso de un lote.
 *
 * Este endpoint es el que obliga a separar "tener rol" de "tener el recurso".
 * No tiene `:id` en la ruta —el lote entero viaja en el body— asi que un guard
 * de nivel no alcanza: la pregunta es de QUIEN son los equipos que se anotan, y
 * eso no se resuelve mirando el verb HTTP ni la forma de la URL.
 *
 * La regla acordada es "todo o nada". Un 200 con los equipos propios y los ajenos
 * descartados en silencio sería indistinguible de un bug: el profesor cree que
 * inscribió cinco equipos y hay tres en la base. Con 403 sabe qué pasó y puede
 * corregir el lote. Ademas el corte va ANTES de validar el negocio, para que un
 * profesor no aprenda si el equipo ajeno está inscripto en el torneo.
 *
 * Es de extremo a extremo a propósito: la regla vive repartida entre el guard de
 * la ruta, el servicio de autorizacion y las consultas del controlador. Un test
 * de servicio que se armara el `req` a mano pasaria aunque el cable entre las
 * tres estuviera desconectado.
 */

const sufijo = crypto.randomBytes(6).toString('hex');
const TAG = `enrollb_${sufijo}`;

const ROL = {
  ADMIN: 'Administrador',
  SUPERADMIN: 'SuperAdmin',
  PROFESOR: 'Profesor',
  ARBITRO: 'Arbitro'
};

let idDisciplina;
let idDistrito;
let idLocalidad;
let instA;
let instB;
let idInstanciaTorneos;

const profesorA = {};
const profesorB = {};
const admin = {};
const superAdmin = {};
const arbitro = {};

/** Equipos: dos del profesor A (para probar el lote multiple) y uno del B. */
const equipos = {};

const IDS_EQUIPOS = [];
const torneos = [];

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  if (!r.rows[0]) {
    // Falla con nombre y no con `undefined.id_rol`: el padron de la base de test
    // no tiene todos los roles de `jebo_2026` y un rol faltante se confunde
    // facil con un error de fixture.
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
    [`EnrollBatch ${rol}`, email, hash, await idRolDe(rol), documento]
  );
  const login = await request(app).post('/auth/login').send({ email, password: pass });
  expect(login.status).toBe(200);
  return { id: ins.rows[0].id_usuario, token: accessTokenDe(login), email };
};

/** Un torneo limpio por caso: el estado de las inscripciones se acumula. */
const crearTorneo = async (nombre) => {
  const r = await dbQuery(
    `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
     VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2, $3)
     RETURNING id_torneo`,
    [`${TAG} ${nombre}`, idDisciplina, idInstanciaTorneos]
  );
  torneos.push(r.rows[0].id_torneo);
  return r.rows[0].id_torneo;
};

const crearEquipo = async (nombre, idInstitucion, idUsuario) => {
  const r = await dbQuery(
    `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario, id_distrito, id_localidad)
     VALUES ($1, '#000000', $2, $3, $4, $5, $6) RETURNING id_equipo`,
    [nombre, idInstitucion, idDisciplina, idUsuario, idDistrito, idLocalidad]
  );
  return r.rows[0].id_equipo;
};

const lote = (token, registrations) =>
  request(app).post('/teams/enroll-batch').set('Authorization', `Bearer ${token}`).send({ registrations });

const inscriptosEn = async (idTorneo) => {
  const r = await dbQuery('SELECT id_equipo FROM posicion WHERE id_torneo = $1 ORDER BY id_equipo', [idTorneo]);
  return r.rows.map((x) => Number(x.id_equipo));
};

const inscripto = async (idEquipo, idTorneo) => {
  const r = await dbQuery('SELECT 1 FROM posicion WHERE id_equipo = $1 AND id_torneo = $2', [idEquipo, idTorneo]);
  return r.rows.length > 0;
};

beforeAll(async () => {
  const loc = await dbQuery('SELECT id_localidad, id_distrito FROM localidad ORDER BY id_localidad LIMIT 1');
  idLocalidad = loc.rows[0].id_localidad;
  idDistrito = loc.rows[0].id_distrito;

  const disc = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion)
     VALUES ($1, 'Reglamento de prueba', 11, $2) RETURNING id_disciplina`,
    [`${TAG} disciplina`, `Disciplina de la suite de enroll-batch ${sufijo}`]
  );
  idDisciplina = disc.rows[0].id_disciplina;

  const inst = await dbQuery(
    `INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia`,
    [`${TAG} instancia`]
  );
  idInstanciaTorneos = inst.rows[0].id_instancia;

  const crearInstitucion = async (nombre) => {
    const r = await dbQuery(
      `INSERT INTO institucion (nombre, tipo, direccion, telefono, id_distrito, id_localidad)
       VALUES ($1, 'Escuela', $2, '0000000', $3, $4) RETURNING id_institucion`,
      [nombre, `${TAG} calle ${sufijo}`, idDistrito, idLocalidad]
    );
    return r.rows[0].id_institucion;
  };

  instA = await crearInstitucion(`${TAG} inst A`);
  instB = await crearInstitucion(`${TAG} inst B`);

  Object.assign(profesorA, await crearUsuarioConToken(ROL.PROFESOR));
  Object.assign(profesorB, await crearUsuarioConToken(ROL.PROFESOR));
  Object.assign(admin, await crearUsuarioConToken(ROL.ADMIN));
  Object.assign(superAdmin, await crearUsuarioConToken(ROL.SUPERADMIN));
  Object.assign(arbitro, await crearUsuarioConToken(ROL.ARBITRO));
  // No hay usuario `Juez`: el padron de la base de test no tiene esa fila en
  // `rol`. El rechazo del Juez ante este endpoint lo cubre la suite unitaria de
  // `autorizacion.service`, que no necesita base.

  equipos.a1 = await crearEquipo(`${TAG} equipo A1`, instA, profesorA.id);
  equipos.a2 = await crearEquipo(`${TAG} equipo A2`, instA, profesorA.id);
  equipos.b1 = await crearEquipo(`${TAG} equipo B1`, instB, profesorB.id);
  // Misma institucion que los de A pero de otro dueño. El permiso del lote es
  // por `equipo.id_usuario`, no por `usuario_institucion`:sharing la institucion
  // no hace suyo el equipo.
  equipos.delAdmin = await crearEquipo(`${TAG} equipo del admin`, instA, admin.id);

  Object.values(equipos).forEach((id) => IDS_EQUIPOS.push(id));
});

afterAll(async () => {
  // El orden lo impone la FK: `posicion` cuelga de `equipo` y `torneo`, y
  // `bitacora` de `usuario`. Sin este orden el cleanup aborta y la suite deja
  // fixtures colgadas en la base de test.
  await dbQuery('DELETE FROM posicion WHERE id_equipo = ANY($1::int[]) OR id_torneo = ANY($2::int[])', [
    IDS_EQUIPOS,
    torneos
  ]);
  await dbQuery('DELETE FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM torneo WHERE id_torneo = ANY($1::int[])', [torneos]);
  await dbQuery('DELETE FROM instancia WHERE descripcion_instancia = $1', [`${TAG} instancia`]);
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

describe('POST /teams/enroll-batch: el permiso del lote', () => {
  it('1) el Administrador inscribe equipos de otras instituciones', async () => {
    const torneo = await crearTorneo('admin');
    const res = await lote(admin.token, [
      { id_equipo: equipos.b1, id_torneo: torneo },
      { id_equipo: equipos.a1, id_torneo: torneo }
    ]);

    expect(res.status).toBe(201);
    expect(await inscriptosEn(torneo)).toEqual([equipos.a1, equipos.b1].sort((x, y) => x - y));
  });

  it('2) el SuperAdmin tambien, sobre los mismos equipos', async () => {
    const torneo = await crearTorneo('superadmin');
    const res = await lote(superAdmin.token, [
      { id_equipo: equipos.b1, id_torneo: torneo },
      { id_equipo: equipos.a2, id_torneo: torneo }
    ]);

    expect(res.status).toBe(201);
    expect((await inscriptosEn(torneo)).length).toBe(2);
  });

  it('3) el Profesor inscribe los suyos, y mas de uno en el mismo lote', async () => {
    const torneoA = await crearTorneo('propio A');
    const torneoB = await crearTorneo('propio B');
    const res = await lote(profesorA.token, [
      { id_equipo: equipos.a1, id_torneo: torneoA },
      { id_equipo: equipos.a2, id_torneo: torneoB }
    ]);

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(2);
    expect(await inscripto(equipos.a1, torneoA)).toBe(true);
    expect(await inscripto(equipos.a2, torneoB)).toBe(true);
  });

  it('4) el Profesor recibe 403 por un solo equipo ajeno', async () => {
    const torneo = await crearTorneo('ajeno');
    const res = await lote(profesorA.token, [{ id_equipo: equipos.b1, id_torneo: torneo }]);

    expect(res.status).toBe(403);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });

  it('5) mezcla de propio y ajeno: 403 y ni una fila escrita', async () => {
    const torneo = await crearTorneo('mezcla');
    const res = await lote(profesorA.token, [
      { id_equipo: equipos.a1, id_torneo: torneo },
      { id_equipo: equipos.b1, id_torneo: torneo },
      { id_equipo: equipos.a2, id_torneo: torneo }
    ]);

    // El 403 es del lote entero, no solo del equipo ajeno: el propio tampoco se
    // inscribe. Este es el caso que separa "rechazar" de "filtrar en silencio".
    expect(res.status).toBe(403);
    expect(await inscriptosEn(torneo)).toEqual([]);
    expect(await inscripto(equipos.a1, torneo)).toBe(false);
    expect(await inscripto(equipos.a2, torneo)).toBe(false);
  });

  it('6) el 403 no dice si el equipo ajeno ya estaba inscripto', async () => {
    // El equipo B quedo inscripto en el torneo del caso 1, con un Administrador.
    // Un profesor que lo mande de nuevo tiene que recibir 403 y no el 409 de
    // "ya esta inscrito": con el 409 confirmaria que el equipo existe y esta
    // anotado en un torneo que no es suyo.
    const torneoDelAdmin = torneos[0];
    expect(await inscripto(equipos.b1, torneoDelAdmin)).toBe(true);

    const res = await lote(profesorA.token, [{ id_equipo: equipos.b1, id_torneo: torneoDelAdmin }]);

    expect(res.status).toBe(403);
    expect(res.body.error).not.toMatch(/inscrit/i);
    expect(res.body.error).not.toMatch(/exist/i);
  });

  it('7) un id de equipo inexistente da 404 para el Profesor', async () => {
    const torneo = await crearTorneo('inexistente');
    const res = await lote(profesorA.token, [
      { id_equipo: equipos.a1, id_torneo: torneo },
      { id_equipo: 99999999, id_torneo: torneo }
    ]);

    expect(res.status).toBe(404);
    // Tampoco parcial: el equipo que sí existe tampoco se inscribe.
    expect(await inscriptosEn(torneo)).toEqual([]);
  });

  it('8) un lote vacio se rechaza en la validacion de la ruta', async () => {
    const res = await lote(profesorA.token, []);

    // 400 y no 201 con una lista vacia: un exito sin filas deja al que lo pidio
    // sin forma de distinguir "no habia nada" de "no se guardo".
    expect(res.status).toBe(400);
  });

  it('9) un rol sin permiso no llega ni al body', async () => {
    const torneo = await crearTorneo('sin permiso');
    const cuerpo = [{ id_equipo: equipos.a1, id_torneo: torneo }];

    // El Arbitro opera partidos y es global, pero no administra equipos: el
    // alcance global no es permiso. El 403 llega antes de tocar `posicion`.
    expect((await lote(arbitro.token, cuerpo)).status).toBe(403);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });

  it('10) sin token no hay lote', async () => {
    const torneo = await crearTorneo('anonimo');
    const res = await request(app)
      .post('/teams/enroll-batch')
      .send({ registrations: [{ id_equipo: equipos.a1, id_torneo: torneo }] });

    expect(res.status).toBe(401);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });
});

describe('POST /teams/enroll-batch: reglas de negocio que siguen vivas', () => {
  it('un Profesor no inscribe dos veces el mismo equipo en el mismo torneo', async () => {
    const torneo = await crearTorneo('duplicado');
    const res = await lote(profesorA.token, [
      { id_equipo: equipos.a1, id_torneo: torneo },
      { id_equipo: equipos.a1, id_torneo: torneo }
    ]);

    expect(res.status).toBe(409);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });

  it('compartir institucion no es ser dueño: el equipo del admin sigue ajeno', async () => {
    const torneo = await crearTorneo('misma institucion');
    const res = await lote(profesorA.token, [{ id_equipo: equipos.delAdmin, id_torneo: torneo }]);

    // El profesor A esta en la institucion de este equipo y aun asi no puede
    // anotarlo: la pertenencia a la institucion alcanza para VER, no para
    // administrar. Si esto pasara, cualquier profesor de una institucion con
    // equipos ajenos podria inscribirlos en un torneo.
    expect(res.status).toBe(403);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });

  it('un torneo inexistente sigue siendo un error de negocio, no de permisos', async () => {
    const res = await lote(profesorA.token, [{ id_equipo: equipos.a1, id_torneo: 99999999 }]);

    // 409 y no 403: el permiso ya se concedio (el equipo es suyo). El fallo es
    // que no existe el torneo.
    expect(res.status).toBe(409);
  });

  it('un mismo profesor no puede llevar dos equipos al mismo torneo', async () => {
    const torneo = await crearTorneo('dos equipos mismo profe');
    const res = await lote(profesorA.token, [
      { id_equipo: equipos.a1, id_torneo: torneo },
      { id_equipo: equipos.a2, id_torneo: torneo }
    ]);

    // Regla del dominio, no del permiso: los dos equipos son del profesor. Antes
    // de F1.4 el lote rechazaba esto con cualquier torneo, porque la llave de
    // deduplicacion era solo el `id_usuario` y no `id_usuario` + `id_torneo`.
    expect(res.status).toBe(409);
    expect(await inscriptosEn(torneo)).toEqual([]);
  });
});