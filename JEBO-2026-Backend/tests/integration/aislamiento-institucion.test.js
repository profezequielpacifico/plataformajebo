const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const alcanceService = require('../../src/services/alcance.service');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

const sufijo = crypto.randomBytes(6).toString('hex');
const TAG = `aisla_${sufijo}`;

const ROL_PROFESOR = 'Profesor';
const ROL_ADMIN = 'Administrador';
const ROL_ARBITRO = 'Arbitro';
const ROL_SUPERADMIN = 'SuperAdmin';

let instA;
let instB;
let instSinDueño;
let tokenProfesorA;
let tokenProfesorB;
let tokenAdmin;
let tokenArbitro;
let tokenSuperAdmin;
let idUsuarioA;
let idUsuarioB;
let idUsuarioAdmin;
let equipoA;
let equipoB;
let equipoHuerfano;
let idDisciplina;
let idLocalidad;
let idDistrito;

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0].id_rol;
};

const crearUsuarioConToken = async (rol, documento) => {
  const email = `${TAG}_${crypto.randomBytes(4).toString('hex')}@jebo.test`;
  const pass = contrasenaDePrueba();
  const hash = await bcrypt.hash(pass, 4);
  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [`Aislamiento ${rol}`, email, hash, await idRolDe(rol), documento]
  );
  const login = await request(app).post('/auth/login').send({ email, password: pass });
  expect(login.status).toBe(200);
  return { id: ins.rows[0].id_usuario, token: accessTokenDe(login), email };
};

beforeAll(async () => {
  const loc = await dbQuery(
    `SELECT l.id_localidad, l.id_distrito
       FROM localidad l ORDER BY l.id_localidad LIMIT 1`
  );
  idLocalidad = loc.rows[0].id_localidad;
  idDistrito = loc.rows[0].id_distrito;

  const disc = await dbQuery(
    `INSERT INTO disciplina (nombre, reglamento, jugadores_por_equipo, descripcion)
     VALUES ($1, 'Reglamento de prueba', 11, $2) RETURNING id_disciplina`,
    [`${TAG} disciplina`, `Disciplina de la suite de aislamiento ${sufijo}`]
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

  instA = await crearInstitucion(`${TAG} inst A`);
  instB = await crearInstitucion(`${TAG} inst B`);
  instSinDueño = await crearInstitucion(`${TAG} inst C`);

  const a = await crearUsuarioConToken(ROL_PROFESOR, `98${sufijo.slice(0, 4)}1`);
  const b = await crearUsuarioConToken(ROL_PROFESOR, `98${sufijo.slice(0, 4)}2`);
  const admin = await crearUsuarioConToken(ROL_ADMIN, `98${sufijo.slice(0, 4)}3`);
  idUsuarioA = a.id; tokenProfesorA = a.token;
  idUsuarioB = b.id; tokenProfesorB = b.token;
  idUsuarioAdmin = admin.id; tokenAdmin = admin.token;

  const arbitro = await crearUsuarioConToken(ROL_ARBITRO, `98${sufijo.slice(0, 4)}4`);
  const superAdmin = await crearUsuarioConToken(ROL_SUPERADMIN, `98${sufijo.slice(0, 4)}5`);
  tokenArbitro = arbitro.token;
  tokenSuperAdmin = superAdmin.token;

  const crearEquipo = async (nombre, idInstitucion, idUsuario) => {
    const r = await dbQuery(
      `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario, id_distrito, id_localidad)
       VALUES ($1, '#000000', $2, $3, $4, $5, $6) RETURNING id_equipo`,
      [nombre, idInstitucion, idDisciplina, idUsuario, idDistrito, idLocalidad]
    );
    return r.rows[0].id_equipo;
  };

  equipoA = await crearEquipo(`${TAG} equipo A`, instA, idUsuarioA);
  equipoB = await crearEquipo(`${TAG} equipo B`, instB, idUsuarioB);
  equipoHuerfano = await crearEquipo(`${TAG} equipo huerfano`, instSinDueño, idUsuarioAdmin);

  await dbQuery(
    'INSERT INTO usuario_institucion (id_usuario, id_institucion) VALUES ($1, $2)',
    [idUsuarioA, instA]
  );
  await dbQuery(
    'INSERT INTO usuario_institucion (id_usuario, id_institucion) VALUES ($1, $2)',
    [idUsuarioB, instB]
  );
});

afterAll(async () => {
  await dbQuery('DELETE FROM usuario_institucion WHERE id_usuario IN ($1, $2)', [idUsuarioA, idUsuarioB]);
  await dbQuery('DELETE FROM equipo WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM institucion WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM disciplina WHERE nombre LIKE $1', [`${TAG}%`]);
  await dbQuery(
    'DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [`${TAG}%`]
  );
  await dbQuery('DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [`${TAG}%`]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [`${TAG}%`]);
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [`${TAG}%`]);
});

const get = (path, token) =>
  request(app).get(path).set('Authorization', `Bearer ${token}`);

const idsEquipo = (body) => (body.data || []).map((e) => e.id_equipo);

describe('Aislamiento entre instituciones (X-05)', () => {
  describe('GET /teams', () => {
    it('el Profesor ve su equipo y no el del otro', async () => {
      const res = await get('/teams?limit=100', tokenProfesorA);

      expect(res.status).toBe(200);
      expect(idsEquipo(res.body)).toContain(equipoA);
      expect(idsEquipo(res.body)).not.toContain(equipoB);
    });

    it('no filtra por una institucion que el cliente pide y no tiene', async () => {
      const res = await get(`/teams?id_institucion=${instB}&limit=100`, tokenProfesorA);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('pide su propia institucion y la recibe', async () => {
      const res = await get(`/teams?id_institucion=${instA}&limit=100`, tokenProfesorA);

      expect(res.status).toBe(200);
      expect(idsEquipo(res.body)).toContain(equipoA);
    });

    it('el Administrador sigue viendo los equipos de todas las instituciones', async () => {
      const res = await get('/teams?limit=100', tokenAdmin);

      expect(res.status).toBe(200);
      expect(idsEquipo(res.body)).toContain(equipoA);
      expect(idsEquipo(res.body)).toContain(equipoB);
    });

    it('una institucion sin Profesor asignado no es visible para ningun Profesor', async () => {
      const res = await get('/teams?limit=100', tokenProfesorA);

      expect(idsEquipo(res.body)).not.toContain(equipoHuerfano);
    });
  });

  describe('GET /teams/:id', () => {
    it('devuelve 404 —no 403— para un equipo de otra institucion', async () => {
      const res = await get(`/teams/${equipoB}`, tokenProfesorA);

      expect(res.status).toBe(404);
    });

    it('devuelve el equipo propio', async () => {
      const res = await get(`/teams/${equipoA}`, tokenProfesorA);

      expect(res.status).toBe(200);
      expect(res.body.data.id_equipo).toBe(equipoA);
    });

    it('el equipo huerfano tampoco se abre por id', async () => {
      const res = await get(`/teams/${equipoHuerfano}`, tokenProfesorB);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /institutions', () => {
    it('el Profesor solo ve su institucion en el padron', async () => {
      const res = await get('/institutions', tokenProfesorA);

      const ids = (res.body.data || []).map((i) => i.id_institucion);
      expect(ids).toContain(instA);
      expect(ids).not.toContain(instB);
    });

    it('GET /institutions/:id de otra institucion es 404', async () => {
      const res = await get(`/institutions/${instB}`, tokenProfesorA);

      expect(res.status).toBe(404);
    });

    it('el Administrador ve el padron completo', async () => {
      const res = await get('/institutions', tokenAdmin);

      const ids = (res.body.data || []).map((i) => i.id_institucion);
      expect(ids).toContain(instA);
      expect(ids).toContain(instB);
    });
  });

  describe('alcanceService', () => {
    it('resuelve global sin tocar la base para un Administrador', async () => {
      const alc = await alcanceService.resolver({ id: idUsuarioAdmin, rol: ROL_ADMIN });

      expect(alc.global).toBe(true);
      expect(alc.instituciones).toBeNull();
    });

    it('resuelve global tambien para un Arbitro', async () => {
      const alc = await alcanceService.resolver({ id: 1, rol: 'Arbitro' });

      expect(alc.global).toBe(true);
      expect(alcanceService.puedeAdministrarUsuarios(alc)).toBe(false);
    });

    it('administrar usuarios es un subconjunto de global, no un sinonimo', () => {
      const puede = alcanceService.puedeAdministrarUsuarios;
      const conRol = (rol) => ({ global: true, instituciones: null, rol });

      expect(puede(conRol('SuperAdmin'))).toBe(true);
      expect(puede(conRol('Administrador'))).toBe(true);
      expect(puede(conRol('Arbitro'))).toBe(false);
      expect(puede(conRol('Juez'))).toBe(false);
      expect(puede(conRol('Profesor'))).toBe(false);
      expect(puede({ global: true, instituciones: null })).toBe(false);
    });

    it('devuelve las instituciones del Profesor', async () => {
      const alc = await alcanceService.resolver({ id: idUsuarioA, rol: ROL_PROFESOR });

      expect(alc.global).toBe(false);
      expect(alc.instituciones).toEqual([instA]);
    });

    it('un usuario sin instituciones queda fail-closed, no global', async () => {
      const sinNada = await alcanceService.resolver({ id: 999999, rol: ROL_PROFESOR });

      expect(sinNada.global).toBe(false);
      expect(sinNada.instituciones).toEqual([]);
    });

    it('sin usuario devuelve el alcance mas restrictivo', async () => {
      const alc = await alcanceService.resolver(null);

      expect(alc.global).toBe(false);
      expect(alc.instituciones).toEqual([]);
    });

    it('filtrarPorInstitucion lanza si no recibe un alcance', () => {
      const knex = require('../../src/config/knex');
      const q = knex('equipo').select('*');

      expect(() => alcanceService.filtrarPorInstitucion(q, undefined, 'id_institucion'))
        .toThrow(/alcance resuelto/);
    });

    it('filtrarPorEquipos y filtrarPorTorneosConEquipo tambien lo exigen', () => {
      const knex = require('../../src/config/knex');
      const q = knex('equipo').select('*');

      expect(() => alcanceService.filtrarPorEquipos(q, undefined, ['id_equipo']))
        .toThrow(/alcance resuelto/);
      expect(() => alcanceService.filtrarPorTorneosConEquipo(q, undefined, 'id_torneo'))
        .toThrow(/alcance resuelto/);
    });
  });

  describe('GET /search/global', () => {
    it('no devuelve los equipos de otra institución', async () => {
      const res = await get(`/search/global?q=${encodeURIComponent(TAG + ' equipo')}`, tokenProfesorA);

      expect(res.status).toBe(200);
      const ids = (res.body.data.equipos || []).map((e) => e.id_equipo);
      expect(ids).toContain(equipoA);
      expect(ids).not.toContain(equipoB);
      expect(ids).not.toContain(equipoHuerfano);
    });

    it('no devuelve las instituciones ajenas', async () => {
      const res = await get(`/search/global?q=${encodeURIComponent(TAG + ' inst')}`, tokenProfesorA);

      expect(res.status).toBe(200);
      const ids = (res.body.data.instituciones || []).map((i) => i.id_institucion);
      expect(ids).toContain(instA);
      expect(ids).not.toContain(instB);
      expect(ids).not.toContain(instSinDueño);
    });

    it('la fila de un equipo ajeno tampoco trae el nombre de su institución', async () => {
      const res = await get(`/search/global?q=${encodeURIComponent(TAG + ' equipo')}`, tokenProfesorA);

      const nombres = (res.body.data.equipos || []).map((e) => e.institucion);
      expect(nombres).not.toContain(`${TAG} inst B`);
      expect(nombres).not.toContain(`${TAG} inst C`);
    });

    it('el Administrador sí busca en todo el sistema', async () => {
      const res = await get(`/search/global?q=${encodeURIComponent(TAG + ' inst')}`, tokenAdmin);

      const ids = (res.body.data.instituciones || []).map((i) => i.id_institucion);
      expect(ids).toContain(instA);
      expect(ids).toContain(instB);
      expect(ids).toContain(instSinDueño);
    });
  });

  describe('GET /statistics/dashboard', () => {
    const cuentaGlobalAlrededor = async (sql, pedir) => {
      const antes = (await dbQuery(sql)).rows[0].n;
      const respuesta = await pedir();
      const despues = (await dbQuery(sql)).rows[0].n;
      return { antes, despues, respuesta };
    };

    it('el Profesor no ve los totales del sistema', async () => {
      const res = await get('/statistics/dashboard', tokenProfesorA);

      expect(res.status).toBe(200);
      expect(res.body.data.total_equipos).toBe(1);
    });

    it('el Administrador ve los totales del sistema', async () => {
      const { antes, despues, respuesta } = await cuentaGlobalAlrededor(
        'SELECT COUNT(*)::int AS n FROM equipo',
        () => get('/statistics/dashboard', tokenAdmin)
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.data.total_equipos).toBeGreaterThanOrEqual(Math.min(antes, despues));
      expect(respuesta.body.data.total_equipos).toBeLessThanOrEqual(Math.max(antes, despues));
      expect(respuesta.body.data.total_equipos).toBeGreaterThan(1);
    });

    it('total_usuarios_activos sigue siendo global, y es deliberado', async () => {
      const { antes, despues, respuesta } = await cuentaGlobalAlrededor(
        "SELECT COUNT(*)::int AS n FROM usuario WHERE estado = 'Activo'",
        () => get('/statistics/dashboard', tokenProfesorA)
      );

      expect(respuesta.body.data.total_usuarios_activos).toBeGreaterThanOrEqual(
        Math.min(antes, despues)
      );
      expect(respuesta.body.data.total_usuarios_activos).toBeLessThanOrEqual(
        Math.max(antes, despues)
      );
    });
  });

  describe('GET /fixture/status/:id_torneo', () => {
    it('un Profesor sin equipo en el torneo no lee su estado', async () => {
      const inst = await dbQuery(
        'INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia',
        [`${TAG} inst Fixture`]
      );
      const t = await dbQuery(
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2)
         RETURNING id_torneo`,
        [`${TAG} torneo`, idDisciplina]
      );
      const idTorneo = t.rows[0].id_torneo;

      await dbQuery(
        'INSERT INTO posicion (id_torneo, id_equipo) VALUES ($1, $2)',
        [idTorneo, equipoA]
      );

      try {
        const visible = await get(`/fixture/status/${idTorneo}`, tokenProfesorA);
        expect(visible.status).toBe(200);
        expect(visible.body.data.torneo).not.toBeNull();

        const ajeno = await get(`/fixture/status/${idTorneo}`, tokenProfesorB);
        expect(ajeno.status).toBe(200);
        expect(ajeno.body.data.torneo).toBeNull();

        const admin = await get(`/fixture/status/${idTorneo}`, tokenAdmin);
        expect(admin.body.data.torneo).not.toBeNull();
      } finally {
        await dbQuery('DELETE FROM posicion WHERE id_torneo = $1', [idTorneo]);
        await dbQuery('DELETE FROM torneo WHERE id_torneo = $1', [idTorneo]);
        await dbQuery('DELETE FROM instancia WHERE descripcion_instancia = $1', [`${TAG} inst Fixture`]);
      }
    });
  });

  describe('lecturas que se armaban en el controlador o en un repositorio sin filtro', () => {
    let inst;
    let idTorneoAjeno;
    let idTorneoMixto;

    const crearTorneo = async (nombre) => {
      const t = await dbQuery(
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2)
         RETURNING id_torneo`,
        [`${TAG} ${nombre}`, idDisciplina]
      );
      return t.rows[0].id_torneo;
    };

    beforeAll(async () => {
      const i = await dbQuery(
        'INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia',
        [`${TAG} inst Lecturas`]
      );
      inst = i.rows[0].id_instancia;

      idTorneoAjeno = await crearTorneo('torneo ajeno');
      idTorneoMixto = await crearTorneo('torneo mixto');

      const anotar = (idTorneo, idEquipo) =>
        dbQuery(
          "INSERT INTO posicion (id_torneo, id_equipo, estado_torneo) VALUES ($1, $2, 'Inscripto')",
          [idTorneo, idEquipo]
        );

      await anotar(idTorneoAjeno, equipoA);
      await anotar(idTorneoMixto, equipoA);
      await anotar(idTorneoMixto, equipoB);

      await dbQuery(
        'INSERT INTO partido (id_torneo, id_equipo_local, id_equipo_visitante) VALUES ($1, $2, $3)',
        [idTorneoAjeno, equipoA, equipoHuerfano]
      );
    });

    afterAll(async () => {
      await dbQuery('DELETE FROM partido WHERE id_torneo IN ($1, $2)', [idTorneoAjeno, idTorneoMixto]);
      await dbQuery('DELETE FROM posicion WHERE id_torneo IN ($1, $2)', [idTorneoAjeno, idTorneoMixto]);
      await dbQuery('DELETE FROM torneo WHERE id_torneo IN ($1, $2)', [idTorneoAjeno, idTorneoMixto]);
      await dbQuery('DELETE FROM instancia WHERE id_instancia = $1', [inst]);
    });

    it('GET /tournaments/:id/qualified no devuelve la tabla de posiciones ajena', async () => {
      const ajeno = await get(`/tournaments/${idTorneoAjeno}/qualified`, tokenProfesorB);

      expect(ajeno.status).toBe(200);
      expect(ajeno.body.data).toEqual([]);

      const propio = await get(`/tournaments/${idTorneoAjeno}/qualified`, tokenProfesorA);
      expect(propio.status).toBe(200);
      expect(propio.body.data.map((p) => p.id_equipo)).toContain(equipoA);

      const compartido = await get(`/tournaments/${idTorneoMixto}/qualified`, tokenProfesorB);
      expect(compartido.status).toBe(200);
      expect(compartido.body.data.map((p) => p.id_equipo)).toContain(equipoA);
    });

    it('GET /tournaments/:id/final no devuelve la final ajena', async () => {
      const ajeno = await get(`/tournaments/${idTorneoAjeno}/final`, tokenProfesorB);

      expect(ajeno.status).toBe(200);
      expect(ajeno.body.data.partidos).toEqual([]);

      const admin = await get(`/tournaments/${idTorneoAjeno}/final`, tokenAdmin);
      expect(admin.status).toBe(200);
      expect(admin.body.data.partidos).toHaveLength(1);
    });

    it('GET /teams/enrolled/list no lista los equipos de otra institucion', async () => {
      const res = await get('/teams/enrolled/list?limit=100', tokenProfesorB);

      expect(res.status).toBe(200);
      const ids = (res.body.data || []).map((e) => e.id_equipo);
      expect(ids).not.toContain(equipoA);
      expect(ids).toContain(equipoB);
    });

    it('el Administrador sigue viendo las inscripciones de todo el sistema', async () => {
      const res = await get('/teams/enrolled/list?limit=100', tokenAdmin);

      expect(res.status).toBe(200);
      const ids = (res.body.data || []).map((e) => e.id_equipo);
      expect(ids).toContain(equipoA);
      expect(ids).toContain(equipoB);
    });
  });
});

describe('Recorte de datos personales (X-16) y administración de usuarios (F1.1)', () => {
  it('GET /users/:id no es un selector: un Profesor recibe 403', async () => {
    const res = await get(`/users/${idUsuarioB}`, tokenProfesorA);

    expect(res.status).toBe(403);
  });

  it('GET /users/:id tampoco para el Administrador: es pantalla de SuperAdmin', async () => {
    const res = await get(`/users/${idUsuarioB}`, tokenAdmin);

    expect(res.status).toBe(403);
  });

  it('GET /auth/me si trae el email propio', async () => {
    const res = await get('/auth/me', tokenProfesorA);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toContain(TAG);
  });

  it('el SuperAdmin si ve la fila completa de un tercero', async () => {
    const res = await get(`/users/${idUsuarioB}`, tokenSuperAdmin);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toContain(TAG);
    expect(res.body.data.documento).toBeTruthy();
  });

  it('GET /users sin filtro de rol para quien no administra usuarios: 403', async () => {
    const res = await get('/users', tokenProfesorA);

    expect(res.status).toBe(403);
  });

  it('el Árbitro es global pero no administra usuarios: sin rol, 403', async () => {
    const res = await get('/users', tokenArbitro);

    expect(res.status).toBe(403);
  });

  it('un Profesor tampoco alcanza la lista aunque mande filtro de rol', async () => {
    const res = await get('/users?rol=Profesor', tokenProfesorA);

    expect(res.status).toBe(403);
  });

  it('el Árbitro tampoco, aunque sea global', async () => {
    const res = await get('/users?rol=Arbitro', tokenArbitro);

    expect(res.status).toBe(403);
  });

  it('el Administrador tampoco lee el padron: era de SuperAdmin desde F1.1 en el fondo', async () => {
    const res = await get('/users', tokenAdmin);

    expect(res.status).toBe(403);
  });

  it('el SuperAdmin tambien administra usuarios: lista sin filtro y con fila completa', async () => {
    const res = await get('/users', tokenSuperAdmin);

    expect(res.status).toBe(200);
    const conDocumento = res.body.data.find((u) => u.documento !== undefined);
    expect(conDocumento).toBeDefined();
  });

  it('buscar por documento ajeno no lo encuentra', async () => {
    const victima = await get(`/users/${idUsuarioB}`, tokenSuperAdmin);
    const documento = victima.body.data.documento;

    const res = await get(`/users?rol=Profesor&search=${documento}`, tokenProfesorA);

    const encontrado = (res.body.data || []).some(
      (u) => String(u.id_usuario) === String(idUsuarioB)
    );
    expect(encontrado).toBe(false);
  });

  it('sin alcance ni solicitante, el repositorio lanza en vez de filtrar de menos', () => {
    const { UsuarioRepository } = require('../../src/repositories');

    expect(() => UsuarioRepository.findById(1)).toThrow(/alcance/);
    expect(() => UsuarioRepository.findAll()).toThrow(/alcance/);
  });
});

describe('Escritura con el alcance resuelto (X-05)', () => {
  let inst;
  let idTorneo;
  let idPartido;
  let tokenArbitro;
  let tokenArbitroAjeno;

  beforeAll(async () => {
    const i = await dbQuery(
      'INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia',
      [`${TAG} inst Escritura`]
    );
    inst = i.rows[0].id_instancia;

    const t = await dbQuery(
      `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina)
       VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2)
       RETURNING id_torneo`,
      [`${TAG} torneo escritura`, idDisciplina]
    );
    idTorneo = t.rows[0].id_torneo;

    const p = await dbQuery(
      'INSERT INTO partido (id_torneo, id_equipo_local, id_equipo_visitante) VALUES ($1, $2, $3) RETURNING id_partido',
      [idTorneo, equipoA, equipoHuerfano]
    );
    idPartido = p.rows[0].id_partido;

    const arbitro = await crearUsuarioConToken('Arbitro', `97${sufijo.slice(0, 4)}1`);
    const arbitroAjeno = await crearUsuarioConToken('Arbitro', `97${sufijo.slice(0, 4)}2`);
    tokenArbitro = arbitro.token;
    tokenArbitroAjeno = arbitroAjeno.token;
    await dbQuery('INSERT INTO staff_partido (id_partido, id_usuario) VALUES ($1, $2)', [
      idPartido,
      arbitro.id
    ]);
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM evento_partido WHERE id_partido = $1', [idPartido]);
    await dbQuery('DELETE FROM partido WHERE id_torneo = $1', [idTorneo]);
    await dbQuery('DELETE FROM torneo WHERE id_torneo = $1', [idTorneo]);
    await dbQuery('DELETE FROM instancia WHERE id_instancia = $1', [inst]);
  });

  const patch = (ruta, token, body) =>
    request(app).patch(ruta).set('Authorization', `Bearer ${token}`).send(body);
  const put = (ruta, token, body) =>
    request(app).put(ruta).set('Authorization', `Bearer ${token}`).send(body);

  it('PATCH /matches/:id/status responde 200 y no 500', async () => {
    const res = await patch(`/matches/${idPartido}/status`, tokenAdmin, { estado: 'En Juego' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('En Juego');
  });

  it('PATCH /matches/:id/result responde 200 y no 500, e IGNORA los goles del body', async () => {
    const reloj = await request(app)
      .post(`/matches/${idPartido}/clock`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ accion: 'INICIAR' });
    expect(reloj.status).toBe(200);

    const res = await patch(`/matches/${idPartido}/result`, tokenAdmin, {
      goles_local: 3,
      goles_visitante: 1
    });

    expect(res.status).toBe(200);
    expect(res.body.data.goles_local).toBe(0);
    expect(res.body.data.goles_visitante).toBe(0);
  });

  it('PATCH /matches/:id/result sin reloj iniciado responde 400 y no sella', async () => {
    const otro = await dbQuery(
      'INSERT INTO partido (id_torneo, id_equipo_local, id_equipo_visitante, estado) VALUES ($1, $2, $3, $4) RETURNING id_partido',
      [idTorneo, equipoA, equipoHuerfano, 'En Juego']
    );

    const res = await patch(`/matches/${otro.rows[0].id_partido}/result`, tokenAdmin, {});

    expect(res.status).toBe(409);
    const fila = await dbQuery('SELECT resultado_cargado FROM partido WHERE id_partido = $1', [
      otro.rows[0].id_partido
    ]);
    expect(fila.rows[0].resultado_cargado).toBe(false);
  });

  it('PATCH /matches/:id/status lo puede hacer el arbitro asignado', async () => {
    const res = await patch(`/matches/${idPartido}/status`, tokenArbitro, { estado: 'En Juego' });

    expect(res.status).toBe(200);
  });

  it('PATCH /matches/:id/status sigue siendo 403 para un arbitro no asignado', async () => {
    const res = await patch(`/matches/${idPartido}/status`, tokenArbitroAjeno, { estado: 'En Juego' });

    expect(res.status).toBe(403);
  });

  it('PUT /matches/:id responde 200 y no 500', async () => {
    const res = await put(`/matches/${idPartido}`, tokenAdmin, { estado: 'En Juego' });

    expect(res.status).toBe(200);
  });

  it('PUT /teams/:id responde 200 y no 500', async () => {
    const res = await put(`/teams/${equipoA}`, tokenAdmin, { colores: '#123456' });

    expect(res.status).toBe(200);
    expect(res.body.data.id_equipo).toBe(equipoA);
  });

  it('PUT /institutions/:id responde 200 y no 500', async () => {
    const actual = await get(`/institutions/${instA}`, tokenAdmin);
    const res = await put(`/institutions/${instA}`, tokenAdmin, { nombre: actual.body.data.nombre });

    expect(res.status).toBe(200);
  });

  it('PUT /tournaments/:id responde 200 y no 500', async () => {
    const res = await put(`/tournaments/${idTorneo}`, tokenAdmin, {
      nombre: `${TAG} torneo escritura renombrado`
    });

    expect(res.status).toBe(200);
  });

  it('sin contexto el servicio sigue fallando ruidosamente', async () => {
    const partidoService = require('../../src/services/partido.service');

    await expect(partidoService.updateStatus(idPartido, 'En Juego')).rejects.toThrow(/alcance resuelto/);
    await expect(partidoService.delete(idPartido)).rejects.toThrow(/alcance resuelto/);
  });
});

describe('Duplicados contra la propia fila (comparacion de id HTTP contra id de la base)', () => {
  let idInstitucion;

  beforeAll(async () => {
    const creado = await request(app)
      .post('/institutions')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre: `${TAG} inst duplicado`,
        tipo: 'Escuela',
        direccion: `${TAG} calle`,
        telefono: '0000000',
        id_distrito: idDistrito,
        id_localidad: idLocalidad
      });
    expect(creado.status).toBe(201);
    idInstitucion = creado.body.data.id_institucion;
  });

  it('PUT /institutions/:id acepta el mismo nombre', async () => {
    const res = await request(app)
      .put(`/institutions/${idInstitucion}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: `${TAG} inst duplicado` });

    expect(res.status).toBe(200);
  });

  it('PUT /institutions/:id sigue rechazando el nombre de otra institucion', async () => {
    const res = await request(app)
      .put(`/institutions/${idInstitucion}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: `${TAG} inst A` });

    expect(res.status).toBe(409);
  });
});
