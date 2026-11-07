require('../setup');

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const knex = require('../../src/config/knex');
const routes = require('../../src/routes');

const app = express();
app.use(express.json());
app.use('/api', routes);

async function obtenerSuperAdminId() {
  const [sa] = await knex.raw(
    "SELECT id_usuario FROM usuario ORDER BY id_usuario LIMIT 1"
  ).then(r => r.rows);

  if (!sa) {
    throw new Error('No se encontró ningún usuario en la BD de pruebas');
  }

  return sa.id_usuario;
}

async function obtenerToken() {
  const idUsuario = await obtenerSuperAdminId();

  return jwt.sign(
    { id: idUsuario, rol: 'SuperAdmin', role: 'SuperAdmin', email: 'superadmin@jebo2026.com', type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256', jwtid: crypto.randomUUID() }
  );
}

async function crearFixtures() {
  const idUsuario = await obtenerSuperAdminId();

  const [distrito] = await knex.raw(
    'INSERT INTO distrito (nombre) VALUES (?) RETURNING id_distrito',
    [`Distrito ${Date.now()}`]
  ).then(r => r.rows);

  const [disciplina] = await knex.raw(
    'INSERT INTO disciplina (nombre, jugadores_por_equipo, tipo_competencia) VALUES (?, 11, ?) RETURNING id_disciplina',
    [`Disciplina ${Date.now()}`, 'MARCADOR']
  ).then(r => r.rows);

  const [institucion] = await knex.raw(
    'INSERT INTO institucion (nombre, id_distrito) VALUES (?, ?) RETURNING id_institucion',
    [`Institucion ${Date.now()}`, distrito.id_distrito]
  ).then(r => r.rows);

  await knex('usuario_institucion')
    .insert({ id_usuario: idUsuario, id_institucion: institucion.id_institucion })
    .onConflict()
    .ignore();

  return { distrito, disciplina, institucion, usuarioId: idUsuario };
}

async function crearEquipos(cantidad, fixtures) {
  const equipos = [];
  for (let i = 0; i < cantidad; i++) {
    const [eq] = await knex.raw(
      `INSERT INTO equipo (nombre, colores, id_institucion, id_disciplina, id_usuario)
       VALUES (?, ?, ?, ?, ?) RETURNING id_equipo`,
      [`Equipo ${Date.now()}_${i}`, '#000000', fixtures.institucion.id_institucion, fixtures.disciplina.id_disciplina, fixtures.usuarioId]
    ).then(r => r.rows);
    equipos.push(eq.id_equipo);
  }
  return equipos;
}

async function limpiarFixtures(fixtures, equipos = []) {
  if (equipos.length > 0) {
    await knex('etapa_participante').whereIn('equipo_id', equipos).del();
  }
  if (equipos.length > 0) {
    await knex('equipo').whereIn('id_equipo', equipos).del();
  }
  await knex.raw('DELETE FROM usuario_institucion WHERE id_institucion = ?', [fixtures.institucion.id_institucion]);
  await knex.raw('DELETE FROM institucion WHERE id_institucion = ?', [fixtures.institucion.id_institucion]);
  await knex.raw('DELETE FROM disciplina WHERE id_disciplina = ?', [fixtures.disciplina.id_disciplina]);
  await knex.raw('DELETE FROM distrito WHERE id_distrito = ?', [fixtures.distrito.id_distrito]);
}

describe('Competencia API - Integración', () => {
  describe('POST /api/competencias', () => {
    it('crea una competencia con etapas y reglas', async () => {
      const token = await obtenerToken();

      const response = await request(app)
        .post('/api/competencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Test Competencia API',
          descripcion: 'Descripción test',
          etapas: [
            {
              nombre: 'Fase de Grupos',
              orden: 1,
              tipo: 'GRUPOS',
              es_final: false,
              reglas: [
                { tipo: 'PARTICIPANTES', configuracion: { minimo: 16, maximo: 16 } },
                { tipo: 'COMPETICION', configuracion: { formato: 'GRUPOS', tamano_grupo: 4 } },
                { tipo: 'CLASIFICACION', configuracion: { metodo: 'POSICION', cantidad: 8 } }
              ]
            },
            {
              nombre: 'Eliminación',
              orden: 2,
              tipo: 'ELIMINACION',
              es_final: true,
              reglas: [
                { tipo: 'PARTICIPANTES', configuracion: { minimo: 8, maximo: 8 } },
                { tipo: 'COMPETICION', configuracion: { formato: 'ELIMINACION' } },
                { tipo: 'CLASIFICACION', configuracion: { metodo: 'GANADOR', cantidad: 1 } }
              ]
            }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id_competencia');
      expect(response.body.data.nombre).toBe('Test Competencia API');
    });

    it('rechaza sin nombre', async () => {
      const token = await obtenerToken();

      const response = await request(app)
        .post('/api/competencias')
        .set('Authorization', `Bearer ${token}`)
        .send({ descripcion: 'Sin nombre' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/competencias', () => {
    it('lista competencias', async () => {
      const token = await obtenerToken();

      const response = await request(app)
        .get('/api/competencias')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/competencias/:id', () => {
    it('obtiene competencia por id', async () => {
      const token = await obtenerToken();

      const createResp = await request(app)
        .post('/api/competencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Test Competencia GET',
          etapas: [{ nombre: 'Fase 1', orden: 1 }]
        });

      const competenciaId = createResp.body.data.id_competencia;

      const response = await request(app)
        .get(`/api/competencias/${competenciaId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.nombre).toBe('Test Competencia GET');
    });
  });

  describe('POST /api/competencias/:etapaId/evaluar', () => {
    it('evalua etapa con StageEngine', async () => {
      const token = await obtenerToken();

      const createResp = await request(app)
        .post('/api/competencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Test Competencia EVAL',
          etapas: [
            { nombre: 'Fase 1', orden: 1, reglas: [{ tipo: 'PARTICIPANTES', configuracion: { minimo: 4 } }] }
          ]
        });

      const etapasResp = await request(app)
        .get(`/api/competencias/${createResp.body.data.id_competencia}/etapas`)
        .set('Authorization', `Bearer ${token}`);

      expect(etapasResp.status).toBe(200);
      expect(etapasResp.body.data.length).toBeGreaterThan(0);

      const etapaId = etapasResp.body.data[0].id_competencia_etapa;

      const evalResp = await request(app)
        .post(`/api/competencias/${etapaId}/evaluar`)
        .set('Authorization', `Bearer ${token}`);

      expect(evalResp.status).toBe(200);
      expect(evalResp.body.data).toHaveProperty('viable');
    });
  });

  describe('POST /api/competencias/:etapaId/generar-participantes', () => {
    it('genera participantes de forma idempotente', async () => {
      const token = await obtenerToken();
      const fixtures = await crearFixtures(token);

      const createResp = await request(app)
        .post('/api/competencias')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nombre: 'Test Competencia Gen',
          etapas: [{ nombre: 'Fase 1', orden: 1 }]
        });

      const etapasResp = await request(app)
        .get(`/api/competencias/${createResp.body.data.id_competencia}/etapas`)
        .set('Authorization', `Bearer ${token}`);

      const etapaId = etapasResp.body.data[0].id_competencia_etapa;

      const equipos = await crearEquipos(16, fixtures);

      const resp1 = await request(app)
        .post(`/api/competencias/${etapaId}/generar-participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ participantes: equipos.map((id, i) => ({ equipo_id: id, posicion: i + 1 })) });

      expect(resp1.status).toBe(201);
      expect(resp1.body.data.length).toBeGreaterThan(0);

      const resp2 = await request(app)
        .post(`/api/competencias/${etapaId}/generar-participantes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ participantes: equipos.map((id, i) => ({ equipo_id: id, posicion: i + 1 })) });

      expect(resp2.status).toBe(201);
      expect(resp2.body.data).toHaveLength(0);

      await limpiarFixtures(fixtures, equipos);
    });
  });

  describe('Autorización', () => {
    it('rechaza sin token', async () => {
      const response = await request(app)
        .get('/api/competencias');

      expect(response.status).toBe(401);
    });

    it('rechaza con token inválido', async () => {
      const response = await request(app)
        .get('/api/competencias')
        .set({ Authorization: 'Bearer invalid-token' });

      expect(response.status).toBe(401);
    });
  });
});
