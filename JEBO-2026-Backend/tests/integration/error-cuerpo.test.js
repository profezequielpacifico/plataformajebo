const request = require('supertest');
const app = require('../../src/app');

describe('X-15: el parser de JSON no devuelve su mensaje crudo', () => {
  it('un JSON sintacticamente invalido responde un mensaje fijo', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{esto no es json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('El cuerpo de la petición no es un JSON válido');
  });

  it('no repite el contenido del cuerpo en la respuesta', async () => {
    const secreto = 'ContraseñaQueNoDeberiaVolver';
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send(`{"email":"${secreto}"`);

    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toContain(secreto);
  });

  it('no devuelve la posicion ni el fragmento que el parser menciona', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":"a@b.com",,,}');

    expect(res.status).toBe(400);
    expect(res.body.error).not.toMatch(/position|line|column|token|Unexpected/i);
  });

  it('un cuerpo en UTF-16 no se filtra reinterpretado en la respuesta', async () => {
    const cuerpo = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('{"email":"a@b.com","password":"ContrasenaSecreta"}', 'utf16le')
    ]);

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json; charset=utf-16')
      .send(cuerpo);

    expect(res.status).toBe(400);

    expect(res.text).toBe(
      JSON.stringify({ success: false, error: 'El cuerpo de la petición no es un JSON válido' })
    );
    expect(res.text).not.toMatch(/物|箿|汩|ContrasenaSecreta/);
  });

  it('un body de mas de 100kb responde 413 y no el mensaje de body-parser', async () => {
    const enorme = JSON.stringify({ relleno: 'a'.repeat(200 * 1024) });

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send(enorme);

    expect(res.status).toBe(413);
    expect(res.body.error).toBe('El cuerpo de la petición excede el tamaño permitido');
    expect(res.body.error).not.toMatch(/100kb|payload too large/i);
  });

  it('un JSON valido no se ve afectado: sigue llegando al controlador', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'nadie@jebo.test', password: 'Aa1constrasenaQueNoExiste' });

    expect(res.status).toBe(401);
    expect(res.body.error).not.toMatch(/JSON|cuerpo de la petición/i);
  });

  it('los errores de validacion de express-validator siguen con su detalle', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toMatch(/email|password|correo|contrase/i);
  });
});
