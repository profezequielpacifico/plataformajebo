const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe } = require('../helpers/cookies');
const usuarioService = require('../../src/services/usuario.service');

let creoRolJuez = false;

const asegurarRolJuez = async () => {
  if (await idRolDe('Juez')) return;
  await dbQuery("INSERT INTO rol (descripcion) VALUES ('Juez')");
  creoRolJuez = true;
};

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;

const PASSWORD = contrasenaDePrueba();

const NOMBRES = {
  profesor: `Profesor Opciones ${TAG}`,
  arbitro: `Arbitro Opciones ${TAG}`,
  juez: `Juez Opciones ${TAG}`
};

const BASE_DOCUMENTO = 90000000 + (parseInt(TAG, 16) % 90000000);
let secuenciaDocumento = 0;
const documentoDe = () => String(BASE_DOCUMENTO + secuenciaDocumento++);

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0] && r.rows[0].id_rol;
};

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
  it('`/users/opciones` NO cae en el requireSuperAdmin de `/users/:id`', async () => {
    const res = await request(app).get('/users/opciones?rol=Profesor').set(como(tokAdmin));
    expect(res.status).toBe(200);
  });

  it('un Admin tampoco puede usar `/users/opciones` como via a `/users/:id`', async () => {
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
    const res = await request(app).get('/users/opciones').set(como(tokSuperAdmin));
    const crudo = JSON.stringify(res.body);
    for (const prohibido of ['email', 'documento', 'password_hash', 'token_version', 'ultimo_acceso', 'estado', 'id_usuario', 'rol_descripcion']) {
      expect(crudo).not.toContain(`"${prohibido}"`);
    }
  });

  it('no expone a SuperAdmin ni a Administrador, que no son personal de partido', async () => {
    const res = await request(app).get('/users/opciones?rol=SuperAdmin').set(como(tokAdmin));
    expect(res.status).toBe(400);

    const resAdmin = await request(app).get('/users/opciones?rol=Administrador').set(como(tokAdmin));
    expect(resAdmin.status).toBe(400);
  });

  it('el repositorio tambien recorta, y el mapeo del controller es la segunda capa', async () => {
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
