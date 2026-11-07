const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const knex = require('../../src/config/knex');
const { query: dbQuery } = require('../../src/config/database.js');
const { contrasenaDePrueba } = require('../helpers/credentials');
const { accessTokenDe, cookiesDe } = require('../helpers/cookies');

const TAG = crypto.randomBytes(4).toString('hex');
const SUFIJO = `%_${TAG}@%`;
const PASA = (email) => `${email}_${TAG}@jebo.test`;

const EMAIL_ADMIN = PASA('admin');
const EMAIL_OBJETIVO = PASA('estado');
const PASSWORD = contrasenaDePrueba();

let tokenAdmin;
let idAdmin;
let idObjetivo;

const tokenVersionDe = async (id) => {
  const r = await dbQuery('SELECT token_version FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].token_version;
};

const estadoDe = async (id) => {
  const r = await dbQuery('SELECT estado FROM usuario WHERE id_usuario = $1', [id]);
  return r.rows[0] && r.rows[0].estado;
};

const idRolDe = async (descripcion) => {
  const r = await dbQuery('SELECT id_rol FROM rol WHERE descripcion = $1', [descripcion]);
  return r.rows[0].id_rol;
};

const filaDe = async (id) => {
  const r = await dbQuery(
    'SELECT id_rol, estado, token_version FROM usuario WHERE id_usuario = $1',
    [id]
  );
  return r.rows[0];
};

const sesionDe = (password) =>
  request(app).post('/auth/login').send({ email: EMAIL_OBJETIVO, password });

const refrescar = (loginRes) => request(app).post('/auth/refresh').set(cookiesDe(loginRes)).send();

const editar = (id, body) =>
  request(app)
    .put(`/users/${id}`)
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send(body);

beforeAll(async () => {
  const idRolAdmin = await idRolDe('Administrador');

  const crear = async (nombre, email, documento) => {
    const hash = await bcrypt.hash(PASSWORD, 4);
    const ins = await dbQuery(
      `INSERT INTO usuario (nombre, email, password_hash, id_rol, estado, documento)
       VALUES ($1, $2, $3, $4, 'Activo', $5) RETURNING id_usuario`,
      [nombre, email, hash, idRolAdmin, documento]
    );
    return ins.rows[0].id_usuario;
  };

  idObjetivo = await crear('Objetivo Estado', EMAIL_OBJETIVO, '90000311');
  idAdmin = await crear('Administrador Estado', EMAIL_ADMIN, '90000310');

  const login = await request(app)
    .post('/auth/login')
    .send({ email: EMAIL_ADMIN, password: PASSWORD });
  expect(login.status).toBe(200);
  tokenAdmin = accessTokenDe(login);
});

afterAll(async () => {
  await dbQuery(
    `DELETE FROM bitacora
      WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)
         OR detalle::jsonb->>'entityId' IN (
              SELECT id_usuario::text FROM usuario WHERE email LIKE $1
            )`,
    [SUFIJO]
  );
  await dbQuery(
    'DELETE FROM refresh_token_revocado WHERE id_usuario IN (SELECT id_usuario FROM usuario WHERE email LIKE $1)',
    [SUFIJO]
  );
  await dbQuery('DELETE FROM login_intentos WHERE identificador LIKE $1', [SUFIJO]);
  await dbQuery('DELETE FROM usuario WHERE email LIKE $1', [SUFIJO]);
});

describe('F1.5.1 — `estado` es escribible y cierra el ciclo de activacion', () => {
  it('un Administrador puede desactivar a un tercero, y su sesion vieja muere', async () => {
    const sesionVieja = await sesionDe(PASSWORD);
    expect(sesionVieja.status).toBe(200);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Inactivo' });
    expect(r.status).toBe(200);
    expect(await estadoDe(idObjetivo)).toBe('Inactivo');

    expect((await refrescar(sesionVieja)).status).toBe(401);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes + 1);
  });

  it('la cuenta desactivada no entra por login, y no lo dice', async () => {
    const r = await sesionDe(PASSWORD);
    expect(r.status).toBe(401);
    expect(r.body.error).toMatch(/credenciales/i);
    expect(r.body.error).not.toMatch(/inactiv/i);
  });

  it('el motivo real queda en la bitacora igual', async () => {
    const r = await dbQuery(
      `SELECT detalle FROM bitacora
        WHERE id_usuario = $1 AND tipo_accion = 'INTENTO_FALLIDO'
        ORDER BY id_bitacora DESC LIMIT 1`,
      [idObjetivo]
    );
    expect(r.rows[0].detalle).toMatch(/inactivo/i);
  });

  it('reactivar deja volver a entrar: desactivar no es puerta de una sola via', async () => {
    const r = await editar(idObjetivo, { estado: 'Activo' });
    expect(r.status).toBe(200);
    expect(await estadoDe(idObjetivo)).toBe('Activo');

    const login = await sesionDe(PASSWORD);
    expect(login.status).toBe(200);
    expect((await refrescar(login)).status).toBe(200);
  });

  it('un estado que no existe es 400 y no escribe nada', async () => {
    const antes = await filaDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Puspendido' });
    expect(r.status).toBe(400);

    expect(await filaDe(idObjetivo)).toEqual(antes);
  });

  it('reenviar el estado que ya tiene no corta la sesion', async () => {
    const login = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { estado: 'Activo' });
    expect(r.status).toBe(200);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes);
    expect((await refrescar(login)).status).toBe(200);
  });
});

describe('F1.5.2 — cambiar el rol invalida lo que el token afirma', () => {
  it('Administrador -> SuperAdmin sube el contador', async () => {
    const sesionVieja = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'SuperAdmin' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('SuperAdmin'));
    expect(fila.token_version).toBe(versionAntes + 1);
    expect((await refrescar(sesionVieja)).status).toBe(401);
  });

  it('SuperAdmin -> Administrador tambien', async () => {
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Administrador' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('Administrador'));
    expect(fila.token_version).toBe(versionAntes + 1);
  });

  it('bajar a un rol inferior tambien, y el token viejo deja de renovar', async () => {
    const sesionVieja = await sesionDe(PASSWORD);
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Arbitro' });
    expect(r.status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.id_rol).toBe(await idRolDe('Arbitro'));
    expect(fila.token_version).toBe(versionAntes + 1);
    expect((await refrescar(sesionVieja)).status).toBe(401);

    expect((await editar(idObjetivo, { rol: 'Administrador' })).status).toBe(200);
  });

  it('reenviar el rol que ya tiene no sube el contador', async () => {
    const versionAntes = await tokenVersionDe(idObjetivo);

    const r = await editar(idObjetivo, { rol: 'Administrador' });
    expect(r.status).toBe(200);

    expect(await tokenVersionDe(idObjetivo)).toBe(versionAntes);
  });

  it('un usuario Inactivo tambien ve su rol cambiado con corte de sesion', async () => {
    const versionAntes = await tokenVersionDe(idObjetivo);

    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);
    expect((await editar(idObjetivo, { rol: 'Profesor' })).status).toBe(200);

    const fila = await filaDe(idObjetivo);
    expect(fila.estado).toBe('Inactivo');
    expect(fila.id_rol).toBe(await idRolDe('Profesor'));
    expect(fila.token_version).toBe(versionAntes + 2);

  });
});

describe('F1.5.2 — el corte de sesion es atomico con el cambio', () => {
  it('un cambio de rol toca `usuario` con un unico UPDATE', async () => {
    const updates = [];
    const escucha = (q) => {
      if (/^\s*update\s+"usuario"/i.test(q.sql)) updates.push(q.sql);
    };
    knex.on('query', escucha);

    try {
      const r = await editar(idObjetivo, { rol: 'Administrador' });
      expect(r.status).toBe(200);
    } finally {
      knex.off('query', escucha);
    }

    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatch(/token_version/i);
  });

  it('un guardado de perfil no toca el contador', async () => {
    const antes = await tokenVersionDe(idObjetivo);
    const r = await editar(idObjetivo, { nombre: 'Nombre Sin Importancia' });
    expect(r.status).toBe(200);
    expect(await tokenVersionDe(idObjetivo)).toBe(antes);
  });
});

describe('F1.5.1 — nadie se desactiva a si mismo', () => {
  it('el Administrador que se desactiva recibe 409 y sigue activo', async () => {
    const versionAntes = await tokenVersionDe(idAdmin);

    const r = await editar(idAdmin, { estado: 'Inactivo' });
    expect(r.status).toBe(409);

    expect(await estadoDe(idAdmin)).toBe('Activo');
    expect(await tokenVersionDe(idAdmin)).toBe(versionAntes);

    const me = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(me.status).toBe(200);
  });

  it('pero sí puede activar y desactivar a otro', async () => {
    expect((await editar(idObjetivo, { estado: 'Activo' })).status).toBe(200);
    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);
    expect((await editar(idObjetivo, { estado: 'Activo' })).status).toBe(200);
  });
});

describe('F1.5 — la bitacora distingue lo que corta sesion', () => {
  const ultimoRegistro = async (tipoAccion, idUsuario) => {
    const r = await dbQuery(
      `SELECT tipo_accion, id_usuario, detalle FROM bitacora
        WHERE tipo_accion = $1
          AND detalle::jsonb->>'entityId' = $2
        ORDER BY id_bitacora DESC LIMIT 1`,
      [tipoAccion, String(idUsuario)]
    );
    return r.rows[0];
  };

  it('la desactivacion tiene entrada propia', async () => {
    expect((await editar(idObjetivo, { estado: 'Inactivo' })).status).toBe(200);

    const fila = await ultimoRegistro('CAMBIAR_ESTADO_USUARIO', idObjetivo);
    expect(fila).toBeDefined();
    expect(fila.detalle).toMatch(/sesion_cortada/);
    expect(fila.detalle).toMatch(/estado/);
    expect(fila.id_usuario).not.toBe(idObjetivo);
  });

  it('el cambio de rol tambien', async () => {
    expect((await editar(idObjetivo, { rol: 'SuperAdmin' })).status).toBe(200);

    const fila = await ultimoRegistro('CAMBIAR_ROL_USUARIO', idObjetivo);
    expect(fila).toBeDefined();
    expect(fila.detalle).toMatch(/sesion_cortada/);
  });

  it('un guardado que no cambia nada queda como edicion de perfil', async () => {
    expect((await editar(idObjetivo, { nombre: 'Otro Nombre' })).status).toBe(200);

    const r = await dbQuery(
      `SELECT tipo_accion, detalle FROM bitacora
        WHERE detalle::jsonb->>'entityId' = $1
        ORDER BY id_bitacora DESC LIMIT 1`,
      [String(idObjetivo)]
    );
    expect(r.rows[0].tipo_accion).toBe('ACTUALIZAR_USUARIO');
    expect(r.rows[0].detalle).not.toMatch(/sesion_cortada/);
  });
});