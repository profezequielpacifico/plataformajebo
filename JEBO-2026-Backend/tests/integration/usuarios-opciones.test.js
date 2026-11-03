const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');
const usuarioService = require('../../src/services/usuario.service');

/**
 * `GET /users` y `GET /users/opciones` son dos contratos distintos (F1.6).
 *
 * Antes los selectores de personal (`MatchFormPage` -> Arbitro, `TeamFormPage` ->
 * Profesor, `GymPresentationsPage` -> Juez) piden `GET /users?rol=X`: la misma
 * ruta que devuelve el padron. De ahi salia el problema, que era doble:
 *
 * - El padron era enumerable para cualquier autenticado, y para un
 *   `requireAdminOrAbove` sin preguntas: email, documento (un DNI), estado y
 *   ultimo acceso de todos los usuarios del sistema.
 * - Ponerle `requireSuperAdmin` a `GET /users` rompia los tres selectores. Es
 *   el mismo modo de fallo que ya se Pago en F1.2: recortar la puerta antes de
 *   haber donde entra la gente.
 *
 * La solucion es separar la ruta, no relajar el guard: `/users` queda en
 * SuperAdmin y `/users/opciones` en Admin-o-superior, con proyeccion fija de
 * tres campos.
 *
 * Que sea Admin-o-superior no es arbitrario: los tres consumidores ya lo son.
 * `POST /matches` y `POST /teams` son `requireAdminOrAbove`, y `gestionarPresentacion`
 * es `esAdministrador`. La regla que queda escrita es "se puede buscar a quien
 * designar solo si se podria crear aquello para lo que se designa".
 */

// La base de test no tiene la fila `Juez` (la de desarrollo si). Otras suites
// la insertan y la borran en su `afterAll`, asi que esta suite la crea solo si
// falta y recuerda si fue ella: borrarla cuando la puso otra suite dejaria sin
// rol a quien la este usando.
let creoRolJuez = false;

const asegurarRolJuez = async () => {
  if (await idRolDe('Juez')) return;
  await dbQuery("INSERT INTO rol (descripcion) VALUES ('Juez')");
  creoRolJuez = true;
};

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;

const PASSWORD = contrasenaDePrueba();

// Nombres reconocibles para poder afirmar sobre la lista sin depender de las
// filas que dejo otra suite. `Ordenar` tambien prueba el `orderBy('u.nombre')`.
const NOMBRES = {
  profesor: `Profesor Opciones ${TAG}`,
  arbitro: `Arbitro Opciones ${TAG}`,
  juez: `Juez Opciones ${TAG}`
};

// Documentos derivados del TAG en vez de un rango fijo.
//
// La primera version de esta suite uso `900003xx` y reviento con
// `duplicate key value violates unique constraint "usuario_documento_unique"`:
// `usuario-rol-estado-sesion.test.js` ya reclama `9000031x` y lo dice en su
// propio comentario. Los rangos fijos obligan a que cada suite nueva sepa que
// rangos existen los demas, y el costo de olvidarse es una cascada de 24 tests
// rojos que no tienen nada que ver con lo que se quiere probar.
//
// `documento` es `varchar(20)` y su unicidad viene del indice. Con el TAG hay
// 32 bits de espacio y esta suite corre sola contra su propia base, asi que la
// colision entre dos TAG es de orden 1/4.000.000.000.
const BASE_DOCUMENTO = 90000000 + (parseInt(TAG, 16) % 90000000);
let secuenciaDocumento = 0;
const documentoDe = () => String(BASE_DOCUMENTO + secuenciaDocumento++);

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0] && r.rows[0].id_rol;
};

// Cada rol de esta suite tiene su propia cuenta con su propia contrasena: si
// compartieran fixture, un test que cambiara el rol de una cuenta cortaria la
// sesion de otra y el resultado dependeria del orden de ejecucion.
const crear = async ({ nombre, rol }) => {
  const idRol = await idRolDe(rol);
  if (!idRol) throw new Error(`La base de test no tiene el rol ${rol}`);
  const ins = await dbQuery(
    `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
     VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
    [nombre, `${nombre.split(' ')[0].toLowerCase()}_${TAG}@jebo.test`, await bcrypt.hash(PASSWORD, 4), idRol, documentoDe()]
  );
  return ins.rows[0].id_usuario;
};

const loginDe = async (email) => {
  const res = await request(app).post('/auth/login').send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return accessTokenDe(res);
};

const correoDe = (nombre) => `${nombre.split(' ')[0].toLowerCase()}_${TAG}@jebo.test`;

const como = (token) => ({ Authorization: `Bearer ${token}` });

let tokAdmin;
let tokSuperAdmin;
let tokProfesor;
let tokArbitro;

beforeAll(async () => {
  await asegurarRolJuez();
  await crear({ nombre: 'Admin Opciones', rol: 'Administrador' });
  await crear({ nombre: 'Super Opciones', rol: 'SuperAdmin' });
  await crear({ nombre: 'Profe Opciones', rol: 'Profesor' });
  await crear({ nombre: 'Arbi Opciones', rol: 'Arbitro' });
  await crear({ nombre: NOMBRES.profesor, rol: 'Profesor' });
  await crear({ nombre: NOMBRES.arbitro, rol: 'Arbitro' });
  await crear({ nombre: NOMBRES.juez, rol: 'Juez' });

  tokAdmin = await loginDe(correoDe('Admin Opciones'));
  tokSuperAdmin = await loginDe(correoDe('Super Opciones'));
  tokProfesor = await loginDe(correoDe('Profe Opciones'));
  tokArbitro = await loginDe(correoDe('Arbi Opciones'));
});

afterAll(async () => {
  await dbQuery('DELETE FROM bitacora WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)', [
    SUFIJO
  ]);
  await dbQuery(
    'DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [SUFIJO]
  );
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [SUFIJO]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [SUFIJO]);
  // Al reves que las demas filas: el rol va DESPUES de los usuarios, porque
  // `usuario.id_rol` tiene clave foranea y borrarlo antes dejaria a los usuarios
  // de esta suite apuntando a un rol que ya no existe.
  if (creoRolJuez) await dbQuery("DELETE FROM rol WHERE descripcion = 'Juez'");
});

const cuerpo = (res) => {
  const datos = res.body && res.body.data !== undefined ? res.body.data : res.body;
  return Array.isArray(datos) ? datos : (datos && datos.data) || [];
};

describe('GET /users — el padron es de SuperAdmin', () => {
  it('un SuperAdmin lo lee', async () => {
    const res = await request(app).get('/users').set(como(tokSuperAdmin));
    expect(res.status).toBe(200);
  });

  it('un Administrador NO lo lee: 403', async () => {
    const res = await request(app).get('/users').set(como(tokAdmin));
    expect(res.status).toBe(403);
  });

  it('con el gate nuevo, el 403 dice que falta SuperAdmin', async () => {
    const res = await request(app).get('/users').set(como(tokProfesor));
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toContain('SuperAdmin');
  });

  it('un Profesor NO lo lee, ni siquiera filtrando por rol', async () => {
    const res = await request(app).get('/users?rol=Profesor').set(como(tokProfesor));
    expect(res.status).toBe(403);
  });

  it('ni el arbitro, que es global pero no administra personas', async () => {
    const res = await request(app).get('/users?rol=Arbitro').set(como(tokArbitro));
    expect(res.status).toBe(403);
  });
});

describe('GET /users/opciones — el selector', () => {
  it('un Administrador entra: es quien arma los jurados', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokAdmin));
    expect(res.status).toBe(200);
    expect(cuerpo(res).length).toBeGreaterThan(0);
  });

  it('un SuperAdmin tambien', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokSuperAdmin));
    expect(res.status).toBe(200);
  });

  it('un Profesor NO: 403', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokProfesor));
    expect(res.status).toBe(403);
  });

  it('un Arbitro NO: puede operar partidos pero no designa a los arbitros', async () => {
    const res = await request(app).get('/users/opciones?rol=Arbitro').set(como(tokArbitro));
    expect(res.status).toBe(403);
  });

  it('sin token: 401', async () => {
    const res = await request(app).get('/users/opciones?rol=Juez');
    expect(res.status).toBe(401);
  });
});

describe('orden de declaracion de las rutas (regresion)', () => {
  // Este test existe por una razon concreta: Express resuelve en orden de
  // declaracion, asi que `router.get('/:id')` agarra `/opciones` si se declara
  // despues. El sintoma no es un 404 ni un 500: es un 403 de
  // `requireSuperAdmin` que hace pensar que al Admin le falta permiso, cuando
  // lo que falta es la linea de la ruta. Sin este test, ese error se diagnostica
  // como "el guard esta mal" y se termina tocando el guard correcto.
  it('`/users/opciones` NO cae en el requireSuperAdmin de `/users/:id`', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokAdmin));
    expect(res.status).toBe(200);
  });

  it('un Admin tampoco puede usar `/users/opciones` como via a `/users/:id`', async () => {
    // Si `opciones` devolviera la fila cruda, `id` seria el id_usuario y este
    // test pasaria de largo. Por eso se afirma sobre la forma de la fila.
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokAdmin));
    const fila = cuerpo(res)[0];
    expect(fila).toBeDefined();
    expect(Object.keys(fila).sort()).toEqual(['id', 'nombre', 'rol']);
  });
});

describe('proyeccion de /users/opciones', () => {
  it('devuelve exactamente id, nombre y rol: ningun dato personal', async () => {
    const res = await request(app).get('/users/opciones').set(como(tokSuperAdmin));
    expect(res.status).toBe(200);
    const filas = cuerpo(res);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(Object.keys(fila).sort()).toEqual(['id', 'nombre', 'rol']);
    }
  });

  it('el JSON entero no contiene ningun campo personal', async () => {
    // Comprobacion sobre el cuerpo crudo, no sobre el array parseado: si un
    // campo personal se colara anidado o con otro nombre, la lista de claves de
    // la fila lo detectaria, pero no algo metido dentro de otro objeto.
    const res = await request(app).get('/users/opciones').set(como(tokSuperAdmin));
    const crudo = JSON.stringify(res.body);
    for (const prohibido of ['email', 'documento', 'password_hash', 'token_version', 'ultimo_acceso', 'estado', 'id_usuario', 'rol_descripcion']) {
      expect(crudo).not.toContain(`"${prohibido}"`);
    }
  });

  it('no expone a SuperAdmin ni a Administrador, que no son personal de partido', async () => {
    // Sin `?rol` la lista son todos los usuarios no administrativos. Con
    // `?rol=SuperAdmin` el enum lo rechaza (400), asi que no hay forma de
    // obtenerlos por esta puerta.
    const res = await request(app).get('/users/opciones?rol=SuperAdmin').set(como(tokAdmin));
    expect(res.status).toBe(400);

    const resAdmin = await request(app).get('/users/opciones?rol=Administrador').set(como(tokAdmin));
    expect(resAdmin.status).toBe(400);
  });

  it('el repositorio tambien recorta, y el mapeo del controller es la segunda capa', async () => {
    // Contraprueba de que el recorte del controller no es decorativo: si
    // `findOpciones` devolviera la fila completa, el mapeo lo taparia y el
    // endpoint seguiria bien, pero la fila completa existiria en el servicio.
    // Afirmar las dos mitades por separado deja ver cual se rompio.
    const crudo = await usuarioService.findOpciones({ rol: 'Profesor' });
    expect(crudo.length).toBeGreaterThan(0);
    expect(Object.keys(crudo[0]).sort()).toEqual(['id_usuario', 'nombre', 'rol_descripcion']);
  });
});

describe('el filtro rol de /users/opciones', () => {
  it('filtra por el rol pedido', async () => {
    const res = await request(app).get('/users/opciones?rol=Juez').set(como(tokAdmin));
    expect(res.status).toBe(200);
    const filas = cuerpo(res);
    expect(filas.length).toBeGreaterThan(0);
    for (const fila of filas) {
      expect(fila.rol).toBe('Juez');
    }
    expect(filas.map((f) => f.nombre)).toContain(NOMBRES.juez);
  });

  it('un rol de personal sin miembros devuelve lista vacia, no 404', async () => {
    const res = await request(app).get('/users/opciones?rol=Arbitro').set(como(tokAdmin));
    expect(res.status).toBe(200);
  });

  it('un rol inventado se rechaza con 400 en vez de devolver la lista entera', async () => {
    const res = await request(app).get('/users/opciones?rol=Inventado').set(como(tokAdmin));
    expect(res.status).toBe(400);
  });

  it('un rol con espacios o sql no se interpreta', async () => {
    for (const raro of ["' OR 1=1 --", 'Juez; DROP TABLE usuario', 'Juez ']) {
      const res = await request(app).get('/users/opciones').query({ rol: raro }).set(como(tokAdmin));
      expect(res.status).toBe(400);
    }
    // La tabla sigue existiendo, que es lo que importa del segundo caso.
    const sigue = await dbQuery('SELECT count(*) AS n FROM usuario');
    expect(Number(sigue.rows[0].n)).toBeGreaterThan(0);
  });

  it('`rol` es opcional: sin filtro trae los roles de personal', async () => {
    const res = await request(app).get('/users/opciones').set(como(tokAdmin));
    expect(res.status).toBe(200);
    const roles = new Set(cuerpo(res).map((f) => f.rol));
    expect(roles.has('Profesor')).toBe(true);
    expect(roles.has('Arbitro')).toBe(true);
    expect(roles.has('Juez')).toBe(true);
  });
});

describe('los selectores existentes siguen funcionando', () => {
  // Los tres consumidores reales. Si alguno dejara de encontrar a su gente, el
  // formulario de alta quedaria sin opciones y nadie se enteraria por un 403.
  it('TeamFormPage: encuentra un Profesor', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokAdmin));
    expect(res.status).toBe(200);
    expect(cuerpo(res).map((f) => f.nombre)).toContain(NOMBRES.profesor);
  });

  it('MatchFormPage: encuentra un Arbitro', async () => {
    const res = await request(app).get('/users/opciones?rol=Arbitro').set(como(tokAdmin));
    expect(res.status).toBe(200);
    expect(cuerpo(res).map((f) => f.nombre)).toContain(NOMBRES.arbitro);
  });

  it('GymPresentationsPage: encuentra un Juez', async () => {
    const res = await request(app).get('/users/opciones?rol=Juez').set(como(tokAdmin));
    expect(res.status).toBe(200);
    expect(cuerpo(res).map((f) => f.nombre)).toContain(NOMBRES.juez);
  });
});
