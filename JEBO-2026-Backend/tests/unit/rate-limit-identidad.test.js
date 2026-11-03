/**
 * X-07: los limites ya no se indexan solo por IP.
 *
 * El defecto original: `keyGenerator: (req) => req.ip` hacia que el presupuesto
 * fuera compartido por todos los usuarios detras de la misma IP. En una escuela
 * —20 usuarios, una IP publica— 15 peticiones de cada uno agotaban el global y
 * el siguiente recibia 429 sin haber hecho nada malo. En autenticacion el efecto
 * era al reves de lo que se busca: 5 intentos fallidos de una cuenta bloquearon
 * el login legitimo del resto.
 *
 * OJO al escribir tests de esto: el store de `express-rate-limit` es un
 * singleton por modulo, asi que el estado de un test se filtra al siguiente de
 * la misma suite. Cada `describe` usa IPs y correos propios para no arrastrar
 * presupuesto, y los limites se miden exhausting desde cero.
 *
 * `next` se invoca SIEMPRE, con error o sin error. El 429 se marca con
 * `res.status(429)`, no con un rechazo de `next`, asi que lo que se observa es
 * el status que el limitador escribe.
 */
describe('Rate limiting por identidad, no por IP (X-07)', () => {
  // El require va adentro del describe (o de un beforeAll), no en el cuerpo de
  // la funcion: Jest evalua el cuerpo del describe en tiempo de carga, antes de
  // que el modulo tenga export listo, y la desestructuracion da undefined.
  let generalLimiter;
  let authLimiter;
  let recoverPasswordLimiter;

  beforeAll(() => {
    ({ generalLimiter, authLimiter, recoverPasswordLimiter } = require('../../src/middleware/rate-limit'));
  });

  const req = (o = {}) => ({ ip: '203.0.113.1', body: {}, headers: {}, ...o });

  const res = () => ({
    codes: [],
    setHeader() {},
    getHeader() { return undefined; },
    status(c) { this.codes.push(c); return this; },
    json() {}, send() {}, end() {}
  });

  const golpear = async (limiter, request) => {
    const r = res();
    await limiter(request, r, () => {});
    return r.codes.includes(429);
  };

  /** Primer numero de peticion que recibe 429, o null si no se llega al tope. */
  const corte = async (limiter, makeReq, max) => {
    for (let i = 1; i <= max; i += 1) {
      if (await golpear(limiter, makeReq(i))) return i;
    }
    return null;
  };

  describe('authLimiter', () => {
    // max: 20. Se sube de 10 porque con la clave por IP 5 intentos fallidos de
    // una cuenta agotaban el bucket de la IP entera y el login legitimo del
    // siguiente usuario caia en 429.
    it('permite 20 intentos a la misma cuenta y corta en el 21', async () => {
      const email = 'limite-cuenta@test.com';
      const n = await corte(authLimiter, () => req({ ip: '198.51.100.1', body: { email } }), 30);
      expect(n).toBe(21);
    });

    it('rotar la IP NO da presupuesto nuevo a la misma cuenta', async () => {
      // Con clave por IP esto no cortaba nunca: el atacante rotaba la cabecera y
      // Cliftonican 6 intentos ilimitados. Con clave por cuenta, la cuenta manda.
      const email = 'rotacion-ip@test.com';
      const n = await corte(authLimiter, (i) => req({ ip: `198.51.100.${i}`, body: { email } }), 30);
      expect(n).toBe(21);
    });

    it('cuentas distintas desde la misma IP NO se bloquean entre si', async () => {
      // El caso NAT escolar: 20 usuarios del mismo colegio, una IP publica. Con
      // la clave por IP, los intentos de uno consumian el presupuesto de todos.
      const ip = '198.51.100.50';
      for (let i = 1; i <= 19; i += 1) {
        await golpear(authLimiter, req({ ip, body: { email: `nat-user-${i}@test.com` } }));
      }
      const cortada = await golpear(authLimiter, req({ ip, body: { email: 'nat-nuevo@test.com' } }));
      expect(cortada).toBe(false);
    });
  });

  describe('generalLimiter', () => {
    it('permite 1000 peticiones al mismo usuario y corta en la 1001', async () => {
      // Antes eran 300 por IP: medido, la peticion 301 recibia 429. Para 20
      // usuarios eso son 15 peticiones cada uno en 15 minutos.
      const n = await corte(generalLimiter, () => req({ ip: '198.51.100.100', user: { id_usuario: 5001 } }), 1100);
      expect(n).toBe(1001);
    });

    it('usuarios autenticados distintos desde la misma IP no se agotan entre si', async () => {
      const ip = '198.51.100.101';
      for (let i = 1; i <= 25; i += 1) {
        await golpear(generalLimiter, req({ ip, user: { id_usuario: 6000 + i } }));
      }
      const cortada = await golpear(generalLimiter, req({ ip, user: { id_usuario: 6999 } }));
      expect(cortada).toBe(false);
    });
  });

  describe('recoverPasswordLimiter', () => {
    // Es un array de dos limitadores encadenados: uno por IP y otro por cuenta.
    // `golpear` los corre en orden, como hace Express, y corta en el primero
    // que responde 429.
    const recovery = (request) => (async () => {
      for (const limiter of recoverPasswordLimiter) {
        const r = res();
        await limiter(request, r, () => {});
        if (r.codes.includes(429)) return true;
      }
      return false;
    })();

    it('corta al 4to intento para un mismo correo', async () => {
      const email = 'recuperar-cuenta@test.com';
      let corteEn = null;
      for (let i = 1; i <= 10; i += 1) {
        if (await recovery(req({ ip: '198.51.100.210', body: { email } }))) { corteEn = i; break; }
      }
      expect(corteEn).toBe(4);
    });

    it('corta por IP aunque cada request use un correo distinto', async () => {
      // Esta es la vía de enumeración. Con clave solo por email no se frenaba:
      // el atacante cambiaba de correo y el contador nunca llegaba a 3.
      const ip = '198.51.100.211';
      let cortada = false;
      for (let i = 1; i <= 12 && !cortada; i += 1) {
        cortada = await recovery(req({ ip, body: { email: `victima-enum-${i}@test.com` } }));
      }
      expect(cortada).toBe(true);
    });

    it('permite pasar los 3 primeros intentos con correos distintos', async () => {
      // El límite por IP es 10, no 3: un colegio entero detrás de una NAT no
      // debe quedar bloqueado entre sí tras tres recuperaciones legitimas.
      const ip = '198.51.100.212';
      for (let i = 1; i <= 3; i += 1) {
        const cortada = await recovery(req({ ip, body: { email: `legit-${i}@test.com` } }));
        expect(cortada).toBe(false);
      }
    });
  });
});
