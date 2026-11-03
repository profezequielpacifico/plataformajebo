const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  it('responde con estado ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('JEBO 2026 API funcionando');
  });
});

describe('Protected routes', () => {
  it('rechaza acceso sin token a /disciplines', async () => {
    const res = await request(app).get('/disciplines');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin token a /tournaments', async () => {
    const res = await request(app).get('/tournaments');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin token a /teams', async () => {
    const res = await request(app).get('/teams');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin token a /matches', async () => {
    const res = await request(app).get('/matches');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin token a /regions', async () => {
    const res = await request(app).get('/regions');
    expect(res.status).toBe(401);
  });

  it('rechaza acceso sin token a /courts', async () => {
    const res = await request(app).get('/courts');
    expect(res.status).toBe(401);
  });
});
