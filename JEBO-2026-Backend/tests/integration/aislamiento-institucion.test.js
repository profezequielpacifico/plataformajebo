const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const alcanceService = require('../../src/services/alcance.service');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

/**
 * Aislamiento entre instituciones en las lecturas (X-05) y recorte de PII (X-16).
 *
 * Por qué estos tests son de extremo a extremo y no de repositorio: el hallazgo
 * no era que faltara un `where`, era que el `where` no existía en ninguna capa.
 * Un test de repositorio que arma su propio `alcance` pasaría aunque el
 * middleware no se lo pasara, y ese es exactamente el cable que se puede
 * desconectar sin que nada se entere. Estos tests piden un token real y pegan
 * contra la app, que es el camino completo.
 *
 * Monta su propia fixture en vez de usar las filas de la base: los ids de
 * institución son distintos en cada corrida y las aserciones tienen que ser
 * sobre relaciones, no sobre números.
 */

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
// Terciario del mismo `padron territorial` que usa la fixture: hace falta para
// armar equipos de la institución A fuera del `beforeAll` principal.
let idLocalidad;
let idDistrito;

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0].id_rol;
};

/** Crea un usuario de prueba y devuelve su token, obtenido con un login real. */
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
  // `institucion` y `equipo` exigen distrito, localidad, tipo, direccion y
  // telefono: la base de test no tiene una disciplina ni un equipo, asi que la
  // fixture se arma completa. Se toma una localidad existente en vez de crear
  // la jerarquia entera — el aislamiento que se prueba es por `institucion`, no
  // por el padron territorial.
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

  // El Árbitro es global por rol (arbitra partidos de todas las instituciones)
  // pero no administra usuarios: es el caso que distingue `alcance.global` de
  // `puedeAdministrarUsuarios`. El SuperAdmin es el único que abre `GET /users/:id`.
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
  // Control del caso "derivado de los datos": la institución C tiene un equipo
  // cuyo dueño es un Administrador. La regla de la migración solo asigna
  // instituciones a Profesores, así que C queda sin Profesor y ningún Profesor
  // debe verla. Si el filtro dejas de estarfail-closed, esta fila aparece.
  equipoHuerfano = await crearEquipo(`${TAG} equipo huerfano`, instSinDueño, idUsuarioAdmin);

  // Lo que hace la migración `usuario_institucion_poblado`, pero de forma
  // explicita: el profesor pertenece a la institucion de los equipos que creo.
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
  // `bitacora` va antes que `usuario`: los tres logins de `beforeAll` escriben
  // filas de auditoria, y `bitacora.id_usuario` tiene FK a `usuario` sin
  // ON DELETE CASCADE. Sin esta linea el cleanup aborta y la suite deja usuarios
  // y sobre todo instituciones colgadas en la base de test, que se acumulan
  // entre corridas.
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
      // El filtro del servidor va primero: pedir `?id_institucion=B` no agranda
      // el alcance, da la interseccion, que es vacia.
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

      // 404 y no 403 a proposito: un 403 confirmaria que el id existe. Con 404
      // no hay forma de enumerar los equipos ajenos probando ids.
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
      // Global, pero no administra usuarios: es la distincion que F1.1 agrega.
      expect(alcanceService.puedeAdministrarUsuarios(alc)).toBe(false);
    });

    it('administrar usuarios es un subconjunto de global, no un sinonimo', () => {
      const puede = alcanceService.puedeAdministrarUsuarios;
      const conRol = (rol) => ({ global: true, instituciones: null, rol });

      // SuperAdmin y Admin: si.
      expect(puede(conRol('SuperAdmin'))).toBe(true);
      expect(puede(conRol('Administrador'))).toBe(true);
      // Globales por otro motivo (arbitran partidos) o acotados: no.
      expect(puede(conRol('Arbitro'))).toBe(false);
      expect(puede(conRol('Juez'))).toBe(false);
      expect(puede(conRol('Profesor'))).toBe(false);
      // Un alcance sin rol (fixture, llamada a mano) cae del lado seguro.
      expect(puede({ global: true, instituciones: null })).toBe(false);
    });

    it('devuelve las instituciones del Profesor', async () => {
      const alc = await alcanceService.resolver({ id: idUsuarioA, rol: ROL_PROFESOR });

      expect(alc.global).toBe(false);
      expect(alc.instituciones).toEqual([instA]);
    });

    it('un usuario sin instituciones queda fail-closed, no global', async () => {
      // El caso que hay que fijar a prueba de regresion: si `resolver`
      // devolviera global para un usuario sin instituciones, un Profesor nuevo
      // veria todo el sistema. Es el error mas grave posible aca.
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

      // Sin este throw, un endpoint nuevo que se olvide de pasar `req.alcance`
      // devolveria la fila completa en silencio.
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

  // Estos endpoints son los que quedaron fuera del primer pase de X-05: se
  // agregaron después de cerrar los listados y no llegaban a tener filtro. Un
  // conteo global y un nombre de institución en la barra de búsqueda filtran
  // tanto como un listado, así que se prueban con la misma fixture.
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
    /**
     * Cuenta de una tabla global leída ALREDEDOR de la request, no después.
     *
     * El problema: `expect(total_equipos).toBe(COUNT(*))` compara una foto del
     * dashboard con una foto posterior de la tabla, y entre las dos hay otro
     * worker de jest insertando o borrando su propia fixture. Cuando eso pasa,
     * el test falla sin que hayagazado ningún cambio — se midió 1 de cada 4
     * corridas completas de la suite, con y sin este archivo.
     *
     * Lo que se sigue probando es lo importante: el número del administrador es
     * el de la tabla entera y el del Profesor es el de su alcance. Que caiga
     * dentro del intervalo [antes, después] es lo único que se puede afirmar sin
     * congelar la base entera.
     */
    const cuentaGlobalAlrededor = async (sql, pedir) => {
      const antes = (await dbQuery(sql)).rows[0].n;
      const respuesta = await pedir();
      const despues = (await dbQuery(sql)).rows[0].n;
      return { antes, despues, respuesta };
    };

    it('el Profesor no ve los totales del sistema', async () => {
      const res = await get('/statistics/dashboard', tokenProfesorA);

      expect(res.status).toBe(200);
      // Su alcance tiene 1 equipo (el suyo), así que el total de equipos tiene
      // que ser 1. Antes contaba sobre la tabla entera.
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
      // El Profesor ve 1 equipo (el suyo). Si el admin no ve más que eso, el
      // total no es global y el rango anterior no lo detectaría.
      expect(respuesta.body.data.total_equipos).toBeGreaterThan(1);
    });

    it('total_usuarios_activos sigue siendo global, y es deliberado', async () => {
      // `usuario` no tiene institución: la pertenencia vive en
      // `usuario_institucion`, que solo se puebla para Profesores. Cualquier
      // "usuarios de mi institución" sería un número inventado. Se deja
      // global y este test lo deja escrito para que no parezca un descuido.
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
      // La fixture no crea torneos, así que este necesita uno propio. El
      // torneo va con un equipo del Profesor A anotado, que es lo que lo hace
      // visible para A y no para B.
      const inst = await dbQuery(
        'INSERT INTO instancia (descripcion_instancia) VALUES ($1) RETURNING id_instancia',
        [`${TAG} inst Fixture`]
      );
      const t = await dbQuery(
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2, $3)
         RETURNING id_torneo`,
        [`${TAG} torneo`, idDisciplina, inst.rows[0].id_instancia]
      );
      const idTorneo = t.rows[0].id_torneo;

      // La inscripción es lo que hace visible el torneo: `filtrarPorTorneosConEquipo`
      // resuelve por `posicion`, no por una columna del torneo. Sin esta fila el
      // torneo sería invisible para los dos profesores y la prueba no probaría
      // la diferencia entre "ajeno" y "no existe".
      await dbQuery(
        'INSERT INTO posicion (id_torneo, id_equipo) VALUES ($1, $2)',
        [idTorneo, equipoA]
      );

      try {
        const visible = await get(`/fixture/status/${idTorneo}`, tokenProfesorA);
        expect(visible.status).toBe(200);
        expect(visible.body.data.torneo).not.toBeNull();

        const ajeno = await get(`/fixture/status/${idTorneo}`, tokenProfesorB);
        // 200 y no 404, y con `torneo: null`. La forma es la misma que antes
        // del filtro: si fuera 404, el Profesor B confirmaría que el id existe.
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
    // Los tres endpoints de abajo no exigen rol: los llama cualquiera con un
    // token, y antes devolvian filas de otras instituciones con el nombre de la
    // institucion al lado. Dos de los tres leian desde el repositorio
    // (`findQualified`, `findFinal`) y el tercero arma su consulta en el
    // controlador, donde el filtro hay que ponerlo a mano.
    let inst;
    // Torneo con un solo equipo de la institucion A: es el que hace las pruebas
    // de "ajeno" possibles. Si el torneo tuviera tambien un equipo de B, B
    // entraria legitimamente y veria la tabla completa, que es lo correcto.
    let idTorneoAjeno;
    // Torneo con equipos de A y de B: el que necesita el listado de inscriptos,
    // porque ahi la pregunta es si la FILA de un equipo ajeno se cuela.
    let idTorneoMixto;

    const crearTorneo = async (nombre) => {
      const t = await dbQuery(
        `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
         VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2, $3)
         RETURNING id_torneo`,
        [`${TAG} ${nombre}`, idDisciplina, inst]
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

      // `estado_torneo` tiene default '16avos': sin ponerlo en 'Inscripto' la
      // fila no cuenta como inscripción y el listado de inscriptos la ignora.
      const anotar = (idTorneo, idEquipo) =>
        dbQuery(
          "INSERT INTO posicion (id_torneo, id_equipo, estado_torneo) VALUES ($1, $2, 'Inscripto')",
          [idTorneo, idEquipo]
        );

      await anotar(idTorneoAjeno, equipoA);
      await anotar(idTorneoMixto, equipoA);
      await anotar(idTorneoMixto, equipoB);

      // Un partido en el torneo ajeno, para que `/final` tenga algo que esconder.
      // El segundo equipo es el huerfano: tampoco es de B, asi que el filtro por
      // institucion del torneo lo cubre sin necesidad de un tercer equipo.
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

      // En un torneo en el que B juega, B ve la tabla entera: es su torneo.
      const compartido = await get(`/tournaments/${idTorneoMixto}/qualified`, tokenProfesorB);
      expect(compartido.status).toBe(200);
      expect(compartido.body.data.map((p) => p.id_equipo)).toContain(equipoA);
    });

    it('GET /tournaments/:id/final no devuelve la final ajena', async () => {
      const ajeno = await get(`/tournaments/${idTorneoAjeno}/final`, tokenProfesorB);

      expect(ajeno.status).toBe(200);
      expect(ajeno.body.data.partidos).toEqual([]);

      // El control: el partido existe y el Administrador lo lee. Si el test
      // anterior pasara porque el filtro no se aplica, este falla.
      const admin = await get(`/tournaments/${idTorneoAjeno}/final`, tokenAdmin);
      expect(admin.status).toBe(200);
      expect(admin.body.data.partidos).toHaveLength(1);
    });

    it('GET /teams/enrolled/list no lista los equipos de otra institucion', async () => {
      // El endpoint alimenta la pantalla "Inscriptos" y el formulario de
      // inscripción, que son de la institución del usuario. Antes devolvía todos
      // los equipos del sistema con su institución.
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

    // Antes daba 200 con la proyección reducida. El endpoint era legible por
    // cualquier autenticado —una fila por id— y su único consumidor es la
    // pantalla de edición de SuperAdmin. Cerrarlo por rol cierra también esa
    // vía de a una fila para el Profesor.
    expect(res.status).toBe(403);
  });

  it('GET /users/:id tampoco para el Administrador: es pantalla de SuperAdmin', async () => {
    const res = await get(`/users/${idUsuarioB}`, tokenAdmin);

    // El Administrador administra la competencia, no las cuentas. La fila
    // completa de un tercero (email, documento, estado, último acceso) no le
    // hace falta para torneos, equipos ni partidos.
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

    // El caso que separa `alcance.global` de `puedeAdministrarUsuarios`: el
    // Árbitro necesita ver partidos de todas las instituciones, pero no tiene
    // por qué enumerar el padrón de personas.
    expect(res.status).toBe(403);
  });

  it('un Profesor tampoco alcanza la lista aunque mande filtro de rol', async () => {
    // Antes esto daba 200 con la proyeccion reducida (X-16): el filtro de rol
    // era lo que separaba al Profesor del padron. Desde F1.6 el padron entero es
    // de SuperAdmin y los selectores van por `/users/opciones`, que tambien es
    // Admin-o-superior. El dato personal sigue sin filtrarse, pero ya no depende
    // de que el cliente se acuerde de mandar `?rol=`.
    const res = await get('/users?rol=Profesor', tokenProfesorA);


    expect(res.status).toBe(403);
  });

  it('el Árbitro tampoco, aunque sea global', async () => {
    const res = await get('/users?rol=Arbitro', tokenArbitro);

    expect(res.status).toBe(403);
  });

  it('el Administrador tampoco lee el padron: era de SuperAdmin desde F1.1 en el fondo', async () => {
    // Este test cambio de asercion en F1.6, y el motivo es que la distincion que
    // sostenia era la proyeccion, no el permiso: un Admin recibia la fila
    // completa de todos los usuarios —email, documento, ultimo acceso— y solo
    // el alcance lo separaba del SuperAdmin. Con `GET /users` en
    // `requireSuperAdmin` y los selectores movidos a `/users/opciones`, la
    // proyeccion de `findAll` dejo de ser la frontera y quedo como defensa.
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

/**
 * El alcance en las operaciones de escritura.
 *
 * `update`, `updateStatus`, `updateResult` y `delete` releen la fila antes de
 * tocarla, y esa relectura pasa por el mismo filtro de institución que las
 * lecturas. Cuando el servicio llamaba a `this.findById(id)` sin el alcance,
 * `filtrarPorEquipos` lanzaba y la respuesta era 500 —para todos los roles,
 * Administrador incluido, porque el throw ocurre antes de mirar si el alcance
 * es global—. O sea: un guard de fail-closed que terminó dejando de lado
 * endpoints que sí funcionaban.
 *
 * Estos tests son de extremo a extremo por la misma razón que los de arriba: el
 * error estaba en el cable entre el middleware y el repositorio, no en el
 * `where`. Un test de servicio que pasara el contexto a mano no lo detectaría.
 */
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
      `INSERT INTO torneo (nombre, categoria, fecha_inicio, fecha_fin, estado, id_disciplina, id_instancia)
       VALUES ($1, 'Unica', current_date, current_date + 1, 'Programado', $2, $3)
       RETURNING id_torneo`,
      [`${TAG} torneo escritura`, idDisciplina, inst]
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
    // Solo uno de los dos queda asignado: la diferencia entre 200 y 403 en
    // `_assertArbitroAsignado`.
    await dbQuery('INSERT INTO staff_partido (id_partido, id_usuario) VALUES ($1, $2)', [
      idPartido,
      arbitro.id
    ]);
  });

  afterAll(async () => {
    // Los partidos que creo el test del reloj con PENDIENTE tambien salen con
    // el torneo: borrar el torneo con un partido colgado revienta el FK.
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
    // Este es el 500 que se vio en la consola del navegador. El mensaje era
    // "filtrarPorEquipos requiere un alcance resuelto (X-05)".
    const res = await patch(`/matches/${idPartido}/status`, tokenAdmin, { estado: 'En Juego' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('En Juego');
  });

  it('PATCH /matches/:id/result responde 200 y no 500, e IGNORA los goles del body', async () => {
    // El alcance primero: este sigue siendo el 500 de X-05 que vigila la suite.
    // Y despues, la garantia nueva: `goles_local`/`goles_visitante` en el body
    // ya no tienen destino. El endpoint los ignora y sella lo que diga el
    // ledger, que en este partido esta vacio. Si alguien volviera a cablear el
    // body al UPDATE, este test pasaria a ver 3-1 y cortaria el cambio.
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
    // 0-0, no 3-1: el ledger del partido no tiene eventos.
    expect(res.body.data.goles_local).toBe(0);
    expect(res.body.data.goles_visitante).toBe(0);
  });

  it('PATCH /matches/:id/result sin reloj iniciado responde 400 y no sella', async () => {
    // Un partido con el reloj PENDIENTE no se puede cerrar: no hay ninguna
    // evidencia de que se haya jugado. Es el unico precondito que agrega el
    // ledger, porque el 0-0 legitimo no se distingue del cierre por error.
    // 409 y no 400: es una regla de negocio ("el reloj no arranco"), no un dato
    // mal formado.
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
    // El filtro de institución no puede comerse el control de rol: el arbitro
    // ajeno tiene alcance global, ve el partido, y aun asi no puede tocarlo.
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
    // Se reenvía el mismo nombre: `update` valida unicidad contra el resto de
    // las filas y una institucion con nombre repetido es un 409 legitimo.
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
    // El arreglo es pasar el alcance, no relajar el filtro: si alguien llama al
    // servicio sin contexto, tiene que seguir saltando.
    const partidoService = require('../../src/services/partido.service');

    await expect(partidoService.updateStatus(idPartido, 'En Juego')).rejects.toThrow(/alcance resuelto/);
    await expect(partidoService.delete(idPartido)).rejects.toThrow(/alcance resuelto/);
  });
});

/**
 * Los chequeos de duplicado comparan el id que vuelve del driver con el que
 * viene de la URL.
 *
 * `req.params.id` es texto y `existing.id_institucion` es entero, asi que con
 * `!=` la fila se declaraba duplicada contra si misma y el `PUT` con el nombre
 * sin cambiar salia 409. No tiene nada que ver con el aislamiento, pero cae en
 * los mismos servicios que se tocan para lo de arriba y es la clase de bug que
 * reaparece cada vez que un id viaja de la capa HTTP a una comparacion de JS.
 */
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

  // Sin `afterAll` propio a proposito: la institucion se va con el cleanup del
  // archivo, que borra los equipos antes que las instituciones. Borrarla antes
  // choca con la FK de `equipo`.

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
