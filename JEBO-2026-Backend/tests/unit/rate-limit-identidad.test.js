describe('Rate limiting por identidad, no por IP (X-07)', () => {
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

  const corte = async (limiter, makeReq, max) => {
    for (let i = 1; i <= max; i += 1) {
      if (await golpear(limiter, makeReq(i))) return i;
    }
    return null;
  };

  describe('authLimiter', () => {
    it('permite 20 intentos a la misma cuenta y corta en el 21', async () => {
      const email = 'limite-cuenta@test.com';
      const n = await corte(authLimiter, () => req({ ip: '198.51.100.1', body: { email } }), 30);
      expect(n).toBe(21);
    });

    it('rotar la IP NO da presupuesto nuevo a la misma cuenta', async () => {
      const email = 'rotacion-ip@test.com';
      const n = await corte(authLimiter, (i) => req({ ip: `198.51.100.${i}`, body: { email } }), 30);
      expect(n).toBe(21);
    });

    it('cuentas distintas desde la misma IP NO se bloquean entre si', async () => {
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

  describe('generalLimiter antes de authenticate', () => {
    const { signAccessToken, signRefreshToken } = require('../../src/config/jwt');
    const conToken = (id, ip) => req({ ip, headers: { authorization: `Bearer ${signAccessToken({ id })}` } });

    it('cuenta por el usuario del token aunque todavia no exista req.user', async () => {
      const token = signAccessToken({ id: 7001 });
      const n = await corte(generalLimiter, (i) => req({
        ip: `198.51.100.${(i % 200) + 1}`,
        headers: { authorization: `Bearer ${token}` }
      }), 1100);
      expect(n).toBe(1001);
    });

    it('lee el token de la cookie igual que authenticate', async () => {
      const token = signAccessToken({ id: 7002 });
      const n = await corte(generalLimiter, () => req({ ip: '198.51.100.102', cookies: { accessToken: token } }), 1100);
      expect(n).toBe(1001);
    });

    it('una escuela detras de una IP no se agota entre usuarios', async () => {
      const ip = '198.51.100.103';
      for (let i = 0; i < 1100; i += 1) {
        await golpear(generalLimiter, conToken(7100, ip));
      }
      expect(await golpear(generalLimiter, conToken(7100, ip))).toBe(true);
      expect(await golpear(generalLimiter, conToken(7101, ip))).toBe(false);
    });

    it('sin token el limite sigue existiendo y es por IP', async () => {
      const n = await corte(generalLimiter, () => req({ ip: '198.51.100.104' }), 3100);
      expect(n).toBe(3001);
    });

    it('un token falsificado o de otro tipo no consigue cupo propio', async () => {
      const ip = '198.51.100.105';
      const invalidos = ['no-es-un-jwt', `${signAccessToken({ id: 7200 })}x`, signRefreshToken({ id: 7200 })];
      const n = await corte(generalLimiter, (i) => req({
        ip,
        headers: { authorization: `Bearer ${invalidos[i % invalidos.length]}` }
      }), 3100);
      expect(n).toBe(3001);
    });
  });

  describe('sessionLimiter', () => {
    const { signAccessToken, signRefreshToken } = require('../../src/config/jwt');
    let sessionLimiter;

    beforeAll(() => {
      ({ sessionLimiter } = require('../../src/middleware/rate-limit'));
    });

    it('agotar el login desde una IP no afecta a refresh, logout ni loginStatus', async () => {
      const ip = '198.51.100.110';
      expect(await corte(authLimiter, () => req({ ip }), 30)).toBe(21);
      expect(await golpear(sessionLimiter, req({ ip }))).toBe(false);
    });

    it('agotar la sesion desde una IP no afecta al login', async () => {
      const ip = '198.51.100.111';
      expect(await corte(sessionLimiter, () => req({ ip }), 1100)).toBe(1001);
      expect(await golpear(authLimiter, req({ ip }))).toBe(false);
    });

    it('cada sesion cuenta por su usuario aunque compartan IP', async () => {
      const ip = '198.51.100.112';
      const deUsuario = (id) => () => req({ ip, cookies: { refreshToken: signRefreshToken({ id }) } });
      expect(await corte(sessionLimiter, deUsuario(7300), 80)).toBe(61);
      expect(await golpear(sessionLimiter, deUsuario(7301)())).toBe(false);
    });

    it('sin refresh token usa la identidad del access token', async () => {
      const ip = '198.51.100.113';
      const token = signAccessToken({ id: 7302 });
      expect(await corte(sessionLimiter, () => req({ ip, cookies: { accessToken: token } }), 80)).toBe(61);
    });

    it('un refresh token invalido cae al cupo de la IP', async () => {
      const ip = '198.51.100.114';
      const n = await corte(sessionLimiter, () => req({ ip, cookies: { refreshToken: 'falso' } }), 1100);
      expect(n).toBe(1001);
    });
  });

  describe('recoverPasswordLimiter', () => {
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
      const ip = '198.51.100.211';
      let cortada = false;
      for (let i = 1; i <= 12 && !cortada; i += 1) {
        cortada = await recovery(req({ ip, body: { email: `victima-enum-${i}@test.com` } }));
      }
      expect(cortada).toBe(true);
    });

    it('permite pasar los 3 primeros intentos con correos distintos', async () => {
      const ip = '198.51.100.212';
      for (let i = 1; i <= 3; i += 1) {
        const cortada = await recovery(req({ ip, body: { email: `legit-${i}@test.com` } }));
        expect(cortada).toBe(false);
      }
    });
  });
});
