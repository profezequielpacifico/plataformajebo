const request = require('supertest');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');

/**
 * Carga de la hoja de evaluación (`POST /presentaciones/:id/evaluaciones`).
 *
 * Este suite existe por una decisión de producto y por lo que se rompió alrededor:
 * el administrador tiene que poder asentar los puntos aunque no figure en el jurado,
 * pero su hoja NO puede entrar al promedio oficial, que es el de las tres hojas del
 * jurado. Son dos restricciones opuestas sobre la misma fila de `evaluacion`, y las
 * dos necesitan prueba:
 *
 *  1. `guardarHoja` tiraba `ForbiddenError` para cualquiera que no estuviera en
 *     `staff_presentacion`. Como el alta de presentación solo ofrece usuarios con rol
 *     'Juez', el administrador no podía llegar a esa fila nunca, y la pantalla de
 *     puntuación le salía entera deshabilitada.
 *  2. `v_resultado_presentacion` promediaba TODAS las filas de `evaluacion`. Al dejar
 *     entrar la del admin, el promedio oficial se corría solo (4 filas en vez de 3) y
 *     el ranking se movía sin que nadie lo hubiera pedido. De ahí el filtro por
 *     `staff_presentacion` en la vista.
 *
 * La fila del admin es una cuarta hoja más, no una de las tres: por eso `jueces_count`
 * sigue dando 3 y el cierre de la presentación no la exige.
 */
const TAG = 'gym-hoja';
const sufijo = crypto.randomBytes(4).toString('hex');

let tokenAdmin;
let tokenJuez1;
let tokenJuez2;
let tokenJuez3;
let tokenJuezFuera;
let tokenArbitro;
let idPresentacion;
// La presentacion que se carga sin jurado la crea el `describe` de mas abajo, pero
// la necesita tambien el de visibilidad: tiene que ser invisible para cualquier
// juez, asi que la variable vive aca y no adentro de ese bloque.
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

// 5 en los ocho campos son 40 puntos; 1 en los ocho son 8. Si el promedio oficial
// llegara a incluir la fila del admin daria (40 + 40 + 40 + 8) / 4 = 32. Con el
// filtro queda en 40, asi que el numero del resultado dice si el filtro esta o no.
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
  // La base de test no trae el rol 'Juez' cargado, y sin el no hay token que pase
  // el `evaluarPresentacion` de la ruta: el rol sale del token, no de la base.
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
    `INSERT INTO torneo (id_disciplina, id_instancia, nombre, fecha_inicio, fecha_fin, estado)
     VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + 30, 'Activo') RETURNING id_torneo`,
    [idDisciplinaEvaluacion, inst.rows[0].id_instancia, `${TAG} torneo ${sufijo}`]
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
      // Solo los tres del jurado. El admin NO entra en `staff_presentacion`: es
      // justamente el caso que hay que cubrir.
      staff: [
        { id_usuario: juez1.id, rol: 'JUEZ_PRESIDENTE' },
        { id_usuario: juez2.id, rol: 'JUEZ' },
        { id_usuario: juez3.id, rol: 'JUEZ' }
      ]
    });
  expect(creada.status).toBe(201);
  idPresentacion = creada.body.id_presentacion;

  // `guardarHoja` solo acepta presentaciones EN_CURSO. Se cambia por SQL y no por el
  // endpoint de estado porque ese camino exige su propia transición de fecha.
  await dbQuery(`UPDATE presentacion SET estado = 'EN_CURSO' WHERE id_presentacion = $1`, [idPresentacion]);

  // Las tres hojas del jurado, que es el estado en el que la presentación está lista
  // para cerrarse y de partida el resultado oficial vale 40.
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
  // El rol 'Juez' lo inserta esta suite. Si queda, la siguiente corrida falla al
  // insertarlo de nuevo.
  await dbQuery('DELETE FROM rol WHERE descripcion = $1', ['Juez']);
});

describe('Hoja de evaluación de una presentación', () => {
  it('deja cargar la hoja a un juez del jurado', async () => {
    // Vuelve a cargar los mismos valores del `beforeAll` a proposito: el test
    // prueba que el camino del jurado sigue andando sin dejar el resultado
    // oficial en un numero que los tests siguientes tengan que saber de memoria.
    const res = await guardar(tokenJuez1, { id_participante_equipo: idEquipo, ...hoja(5) });

    expect(res.status).toBe(200);
    expect(res.body.coord_1).toBe(5);
    // Vuelve la fila del juez 1 y no la de otro: el `upsert` es por
    // (presentacion, participante, juez) y el juez sale del token.
    expect(res.body.id_juez).toBe(idJuez1);
  });

  // El cambio pedido: el admin organiza la jornada y es quien asienta los puntos.
  // Antes `guardarHoja` exigia estar en `staff_presentacion` y le tiraba
  // "No eres juez de esta presentación", que en la pantalla se traducía en una hoja
  // entera sin poder tocar.
  it('deja cargar la hoja al administrador aunque no figure en el jurado', async () => {
    const res = await guardar(tokenAdmin, { id_participante_equipo: idEquipo, ...hoja(1) });

    expect(res.status).toBe(200);
    expect(res.body.coord_1).toBe(1);

    // Queda una fila propia del admin al lado de las tres del jurado, y no se pisa
    // ninguna: el `upsert` es por (presentacion, participante, juez) con el juez que
    // sale del token.
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

  // El punto critico de la decision: la hoja del admin es una cuarta hoja mas, no una
  // de las tres del jurado. Si la vista la promedia, el resultado oficial se corre y
  // el ranking se mueve solo.
  it('el promedio oficial no incluye la hoja del administrador', async () => {
    await guardar(tokenAdmin, { id_participante_equipo: idEquipo, ...hoja(1) });

    const res = await request(app)
      .get(`/presentaciones/${idPresentacion}/resultado`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.resultado).toHaveLength(1);
    // (40 + 40 + 40) / 3 = 40. Si la fila del admin contara seria
    // (40 + 40 + 40 + 8) / 4 = 32.
    expect(Number(res.body.resultado[0].puntaje_promedio)).toBe(40);
    // `COUNT` sale de la vista como bigint, y el driver lo devuelve como texto.
    expect(Number(res.body.resultado[0].jueces_count)).toBe(3);
  });

  // La fila del admin no puede volver exigible: el cierre sigue mirando solo al
  // jurado, asi que una hoja de mas no genera errores ni falta de jueces.
  it('la hoja del administrador no altera el cierre de la presentación', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idPresentacion}/validar-cierre`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.valido).toBe(true);
    expect(res.body.errores).toEqual([]);
  });

  // Un juez que no esta en el jurado de ESTA presentacion sigue sin poder escribir:
  // es el caso de un juez de otro torneo que abre la URL de la hoja.
  it('rechaza a un juez que no está en el jurado de esta presentación', async () => {
    const res = await guardar(tokenJuezFuera, { id_participante_equipo: idEquipo, ...hoja(2) });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no eres juez/i);
  });

  it('rechaza a un usuario que no es juez ni administrador', async () => {
    const res = await guardar(tokenArbitro, { id_participante_equipo: idEquipo, ...hoja(2) });

    expect(res.status).toBe(403);
    // Antes el mensaje era el del guard de nivel ("se requiere rol: ..."). Con
    // `evaluarPresentacion` el corte lo da `assertEvaluarPresentacion`, que
    // además distingue el motivo: un arbitro no es "juez de esta presentacion",
    // es un rol que no carga hojas. Lo que importa es que el 403 siga siendo un
    // 403 y no un 500 por una escritura a medias.
    expect(res.body.error).toMatch(/juez/i);
  });
});

/**
 * F1.5.3 — `GET /presentaciones/:id/evaluaciones` devuelve la hoja de QUIEN
 * PREGUNTA, no la de quien el cliente nombre.
 *
 * El endpoint aceptaba `?id_juez=` y, si venía, ganaba sobre el token. El guard
 * `evaluarPresentacion` filtra por nivel y por jurado, así que un juez del jurado
 * de esa presentación pasaba el filtro de sobra —era jurado, de hecho— y después
 * elegía la hoja de otro juez con el mismo `?id_juez=`. El filtro de jurado no
 * protege contra eso: protege contra entrar, no contra mirar adentro.
 *
 * El parametro desaparece del contrato en lugar de ignorarse. Ignorarlo alcanza
 * para cerrar el agujero, pero deja en la API una promesa que no se cumple y un
 * cliente que la use sigue creyendo que funciona.
 *
 * Va ACÁ y no al final del archivo a propósito: el `afterAll` de "Visibilidad de
 * los encuentros por rol" borra todas las presentaciones del torneo de la suite,
 * `idPresentacion` incluida. Más abajo estos tests darían 404 y el fallo apuntaría
 * al guard, que es justo donde no está la causa.
 */
describe('F1.5.3 — la identidad del juez sale del token, no de la query', () => {
  // Hojas con valores distintos por juez para que la respuesta diga de quién es.
  // Si las dos tuvieran los mismos números, un `?id_juez=` ignorado y uno aplicado
  // darían la misma lista y el test pasaría por el motivo equivocado.
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
    // Este es el test que falla con el código anterior: el parametro ganaba sobre el
    // token y devolvía las hojas de `idJuez2`.
    const engañado = await leer(tokenJuez1, `?id_juez=${idJuez2}`);
    expect(engañado.status).toBe(200);

    const ids = engañado.body.map((e) => e.id_juez);
    expect(ids).toContain(idJuez1);
    expect(ids).not.toContain(idJuez2);
    // Y sale la hoja del token, no la del parametro: 1 en vez de 2.
    expect(engañado.body[0].coord_1).toBe(1);
  });

  it('lo mismo si el id viene con basura en vez de un entero', async () => {
    // El parametro nunca estuvo validado en la ruta, así que `parseInt` se comía
    // cualquier cosa. Hoy da lo mismo porque ya no se lee, pero el caso queda fijo
    // para que reintroducirlo rompa el test y no pase inadvertido.
    const basura = await leer(tokenJuez1, '?id_juez=abc');
    expect(basura.status).toBe(200);
    expect(basura.body.map((e) => e.id_juez)).not.toContain(idJuez2);
  });

  it('un Arbitro tampoco puede pedir la hoja de un juez', async () => {
    // El parametro no era el único camino: el rol del token tampoco debe abrir este
    // endpoint. El guard es `evaluarPresentacion` desde F1.4 y el corte por rol que
    // hace queda probado acá, junto con el resto de las reglas del endpoint.
    const res = await leer(tokenArbitro);
    expect(res.status).toBe(403);
  });

  it('al administrador le devuelve su propia hoja, no la de un juez', async () => {
    // El admin entra siempre por el guard, incluso sin estar en el jurado. Con
    // `?id_juez=` podía pedir la hoja de un juez y leer sus notas, que no son suyas
    // ni entran en ningún promedio suyo.
    const res = await leer(tokenAdmin, `?id_juez=${idJuez1}`);
    expect(res.status).toBe(200);

    const ids = res.body.map((e) => e.id_juez);
    expect(ids).not.toContain(idJuez1);
    expect(ids).not.toContain(idJuez2);
    // El admin carga su propia hoja en otro test, así que la lista viene vacía:
    // lo que importa es que no haya salido la de otro.
    expect(ids.every((id) => id === idAdmin)).toBe(true);
  });
});

// El filtro por jurado que hace que la hoja del admin no entre al promedio se
// llevo por delante los resultados de varias presentaciones de la base de
// desarrollo que tienen hojas cargadas y ninguna fila en `staff_presentacion`: se
// armaron por SQL sin el jurado, y con el filtro estricto desaparecian de la vista
// sin dejarerror en ninguna parte.
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

    // Dos hojas metidas por SQL, sin pasar por `guardarHoja` (que habria rechazado a
    // los autores por no estar en el staff). Es como quedaron esos datos.
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
    // (40 + 24) / 2 = 32.
    expect(Number(res.body.resultado[0].puntaje_promedio)).toBe(32);
  });
});

/**
 * Qué encuentros ve cada rol (`GET /presentaciones`) y qué puede tocar.
 *
 * Antes `GET /presentaciones` era `requireAdmin`, o sea que un juez no tenía por
 * donde llegar a su propia hoja: la pantalla dePresentaciones le cargaba con
 * "Error al cargar: Se requiere rol: Administrador" y le mostraba "No hay encuentros".
 * La hoja era suya (`guardarHoja` lo aceptaba), pero no había camino de pantalla.
 *
 * La regla que se resuelve acá es de visibilidad, no de permiso nuevo: el juez ve
 * SOLO los encuentros donde figura en el jurado, el admin sigue viendo la jornada
 * completa, y el resto de los roles sigue sin ver nada. Todo lo que es
 * organizacion de la jornada (alta, ciclo de vida, borrado) queda siendo del admin,
 * y con permiso de verdad: ocultar el boton no alcanza si la ruta lo deja pasar.
 *
 * Estas pruebas viven en este archivo y no en uno nuevo por una razon concreta: el
 * rol 'Juez' lo inserta el `beforeAll` de arriba y el `afterAll` lo borra. Dos
 * suites que lo inserten en paralelo (jest corre las de `tests/` en varios workers)
 * se pisan: una borra el `id_rol` que la otra esta usando para autenticar a sus
 * jueces. Reusando los mismos fixtures no hay carrera.
 */
describe('Visibilidad de los encuentros por rol', () => {
  // Cuerpo comun del `POST`: el backend exige torneo, disciplina, orden, el trio y
  // el jurado, y arma la presentacion en una transaccion.
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
    // Ordenes 3 y 4: el 1 lo usa la presentacion con las hojas del jurado y el 2 la
    // que se cargo sin jurado. `POST` rechaza el orden repetido dentro de un torneo.
    const otroJurado = await crear(tokenAdmin, base(idTorneo, 3, [
      { id_usuario: idJuez3, rol: 'JUEZ_PRESIDENTE' },
      { id_usuario: idJuez2, rol: 'JUEZ' }
    ]));
    expect(otroJurado.status).toBe(201);
    idOtroJurado = otroJurado.body.id_presentacion;

    // El juez 1 figura en el staff, pero como SECRETARIO: esta en la organizacion
    // del encuentro, no en el jurado, asi que no es suyo para puntuar.
    const comoSecretario = await crear(tokenAdmin, base(idTorneo, 4, [
      { id_usuario: idJuez1, rol: 'SECRETARIO' },
      { id_usuario: idJuez2, rol: 'JUEZ' }
    ]));
    expect(comoSecretario.status).toBe(201);
    idComoSecretario = comoSecretario.body.id_presentacion;

    // Un torneo aparte con un encuentro del juez 1, para que el filtro por torneo se
    // pueda comprobar contra algo.
    const inst = await dbQuery('SELECT id_instancia FROM instancia ORDER BY id_instancia LIMIT 1');
    const torneoAjeno = await dbQuery(
      `INSERT INTO torneo (id_disciplina, id_instancia, nombre, fecha_inicio, fecha_fin, estado)
       VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + 30, 'Activo') RETURNING id_torneo`,
      [idDisciplinaEvaluacion, inst.rows[0].id_instancia, `${TAG} torneo ajeno ${sufijo}`]
    );
    idTorneoAjeno = torneoAjeno.rows[0].id_torneo;

    const enOtroTorneo = await crear(tokenAdmin, base(idTorneoAjeno, 1, [
      { id_usuario: idJuez1, rol: 'JUEZ_PRESIDENTE' }
    ]));
    expect(enOtroTorneo.status).toBe(201);
    idEnOtroTorneo = enOtroTorneo.body.id_presentacion;
  });

  afterAll(async () => {
    // Las presentaciones borran su staff y sus participantes por cascada.
    await dbQuery('DELETE FROM presentacion WHERE id_torneo IN (SELECT id_torneo FROM torneo WHERE nombre LIKE $1)', [`${TAG}%`]);
  });

  it('el juez ve solo los encuentros donde figura en el jurado', async () => {
    const res = await listar(tokenJuez1);

    expect(res.status).toBe(200);
    const ids = res.body.map((p) => p.id_presentacion);
    // El suyo del torneo principal y el suyo del torneo ajeno.
    expect(ids).toContain(idPresentacion);
    expect(ids).toContain(idEnOtroTorneo);
    // El del panel del juez 3, el que figura como secretario y el que se cargo sin
    // jurado: ninguno es suyo.
    expect(ids).not.toContain(idOtroJurado);
    expect(ids).not.toContain(idComoSecretario);
    expect(ids).not.toContain(idPresentacionSinJurado);
  });

  // El filtro por jurado no reemplaza a los otros filtros, se suma con ellos: al
  // pedir el torneo ajeno el juez tiene que ver su encuentro y nada mas.
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

  // El ciclo de vida del encuentro es de quien organiza la jornada. La ruta es
  // `gestionarPresentacion` (SuperAdmin/Administrador) y el unico freno de antes
  // era que el boton no estuviera en pantalla; con el juez viendo el listado, el
  // freno tiene que ser el permiso.
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

  // Filtrar el listado no alcanza si la hoja se puede abrir por URL: se verian las
  // hojas de los demas jueces del encuentro.
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

  // Al admin se lo deja entrar siempre: es quien asienta los puntos aunque no figure
  // en el jurado.
  it('el administrador entra a la hoja de un encuentro que no organiza', async () => {
    const res = await request(app)
      .get(`/presentaciones/${idOtroJurado}/detalle-evaluacion`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.currentUserId).toBe(idAdmin);
  });
});