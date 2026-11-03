const request = require('supertest');
const app = require('../../src/app');

/**
 * Errores del parser de JSON (X-15).
 *
 * El problema medido contra el despliegue: `POST /auth/login` con
 * `Content-Type: application/json; charset=utf-16` contestaba
 *
 *   {"error":"Unexpected token '物', \"物箿攢慭汩㨢愢所挮浯索\" is not valid JSON"}
 *
 * El mensaje crudo del parser, con los primeros bytes del cuerpo decodificados
 * con el charset que declaró el cliente. Tres cosas malas en una respuesta:
 *
 *   1. Eco de entrada. El cliente ve su propio input de vuelta, lo que confirma
 *      que hay un parser detrás y filtra la versión exacta de Node.
 *   2. Para el usuario legítimo es inservible: el mensaje habla de caracteres
 *      chinos porque el teléfono declaró un charset que no era.
 *   3. El cuerpo puede contener la contraseña que el usuario estaba escribiendo,
 *      y `err.body` existe justamente para eso.
 *
 * Estos tests van contra la app, no contra el `errorHandler` aislado, porque lo
 * que hay que fijar es que la traducción ocurra para el error real de
 * `express.json()` y no para un objeto que uno construye a mano en el test.
 */

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
    // El caso que importa: un usuario que manda su password a medio escribir y
    // el JSON queda mal cerrado. Antes, la password volvía en el `error`.
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
    // El caso exacto del reporte. `express.json()` no decodifica UTF-16: lee
    // el buffer como UTF-8, y los bytes del string UTF-16 salen como caracteres
    // chinos. El mensaje crudo del parser los devolvía tal cual.
    const cuerpo = Buffer.concat([
      Buffer.from([0xff, 0xfe]),
      Buffer.from('{"email":"a@b.com","password":"ContrasenaSecreta"}', 'utf16le')
    ]);

    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json; charset=utf-16')
      .send(cuerpo);

    expect(res.status).toBe(400);

    // Se mira `res.text` y no `res.body` a propósito: superagent elige el
    // parser de la respuesta según el Content-Type de la petición, así que con
    // `charset=utf-16` deja `res.body` sin parsear. El texto crudo es lo que ve
    // el cliente, que es lo que hay que asegurar.
    expect(res.text).toBe(
      JSON.stringify({ success: false, error: 'El cuerpo de la petición no es un JSON válido' })
    );
    // Ni los caracteres reinterpretados, ni la contrasena que estaba escribiendo.
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
    // El mensaje crudo de body-parser incluye el límite y el tamaño recibido.
    expect(res.body.error).not.toMatch(/100kb|payload too large/i);
  });

  it('un JSON valido no se ve afectado: sigue llegando al controlador', async () => {
    // La traducción no puede comerse los errores de negocio: un login con
    // credenciales malas tiene que seguir diciendo por que fallo.
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: 'nadie@jebo.test', password: 'Aa1constrasenaQueNoExiste' });

    expect(res.status).toBe(401);
    expect(res.body.error).not.toMatch(/JSON|cuerpo de la petición/i);
  });

  it('los errores de validacion de express-validator siguen con su detalle', async () => {
    // Los errores de campo SÍ deben listar los campos: son la mitad del trabajo
    // de un formulario. Lo que no debe pasar es que se traduzcan todos a un
    // mensaje genérico.
    const res = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toMatch(/email|password|correo|contrase/i);
  });
});
