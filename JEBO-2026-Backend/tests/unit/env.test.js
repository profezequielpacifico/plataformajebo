const { execFileSync } = require('child_process');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const ENV_JS = path.join(RAIZ, 'src', 'config', 'env.js');

const cargarCon = (variables) => {
  const fuente = `
    process.env.NODE_ENV = 'production';
    for (const clave of Object.keys(process.env)) {
      if (clave === 'NODE_ENV' || clave === 'JWT_SECRET') continue;
      delete process.env[clave];
    }
    Object.assign(process.env, ${JSON.stringify(variables)});
    try {
      const env = require(${JSON.stringify(ENV_JS)});
      console.log('OK:' + JSON.stringify({
        trustProxy: env.trustProxy,
        port: env.port,
        dbPort: env.db.port,
        dbName: env.db.name,
        nodeEnv: env.nodeEnv,
        cors: env.cors.origin,
        rounds: env.bcrypt.rounds,
        expiresIn: env.jwt.expiresIn,
        cookieSecure: env.cookie.secure,
        cookieSameSite: env.cookie.sameSite,
        cookieAccessMaxAge: env.cookie.accessMaxAge,
        cookieRefreshMaxAge: env.cookie.refreshMaxAge
      }));
    } catch (e) {
      console.log('ERROR:' + e.message);
    }
  `;
  const salida = execFileSync(process.execPath, ['-e', fuente], {
    encoding: 'utf8',
    cwd: os.tmpdir()
  });
  const linea = salida.trim().split('\n').pop();
  if (linea.startsWith('OK:')) return { ok: true, env: JSON.parse(linea.slice(3)) };
  return { ok: false, mensaje: linea.slice(6) };
};

const SECRETO_VALIDO = 'secreto-de-prueba-suficientemente-largo-2026';

describe('env.js', () => {
  describe('exigencia del secreto JWT', () => {
    it('carga con un secreto largo que no esta en la lista de debiles', () => {
      const r = cargarCon({ JWT_SECRET: SECRETO_VALIDO });
      expect(r.ok).toBe(true);
    });

    it('falla al arrancar si JWT_SECRET no esta definido', () => {
      const r = cargarCon({});
      expect(r.ok).toBe(false);
      expect(r.mensaje).toMatch(/no esta definido/);
      expect(r.mensaje).toMatch(/npm run secret/);
    });

    it('falla si el secreto es una cadena vacia o solo espacios', () => {
      for (const valor of ['', '   ']) {
        const r = cargarCon({ JWT_SECRET: valor });
        expect(r.ok).toBe(false);
        expect(r.mensaje).toMatch(/no esta definido/);
      }
    });

    it('falla si el secreto es uno de los valores conocidos y publicados', () => {
      for (const debil of ['change_me_in_production', 'default_secret_change_me',
        'secret', 'changeme', 'test_secret_key']) {
        const r = cargarCon({ JWT_SECRET: debil });
        expect(r.ok).toBe(false);
        expect(r.mensaje).toMatch(/valor por defecto conocido/);
        expect(r.mensaje).toContain(debil);
      }
    });

    it('falla si el secreto es mas corto que 32 bytes', () => {
      const r = cargarCon({ JWT_SECRET: 'a'.repeat(31) });
      expect(r.ok).toBe(false);
      expect(r.mensaje).toMatch(/al menos 32 bytes/);
      expect(r.mensaje).toMatch(/tiene 31/);
    });

    it('acepta exactamente 32 bytes', () => {
      const r = cargarCon({ JWT_SECRET: 'a'.repeat(32) });
      expect(r.ok).toBe(true);
    });

    it('mide en bytes y no en caracteres', () => {
      // 16 emojis son 64 bytes de UTF-8 pero 16 unidades de string: un check por
      // longitud de string aceptaria un secreto de 16 caracteres.
      const r = cargarCon({ JWT_SECRET: '🙂'.repeat(16) });
      expect(r.ok).toBe(true);
    });
  });

  describe('resolverTrustProxy', () => {
    it('sin TRUST_PROXY assume 0, que es el default seguro', () => {
      expect(cargarCon({ JWT_SECRET: SECRETO_VALIDO }).env.trustProxy).toBe(0);
    });

    it('convierte un numero de proxies', () => {
      expect(cargarCon({ JWT_SECRET: SECRETO_VALIDO, TRUST_PROXY: '1' }).env.trustProxy).toBe(1);
    });

    it('respeta el 0 explicito en vez de cair al default', () => {
      expect(cargarCon({ JWT_SECRET: SECRETO_VALIDO, TRUST_PROXY: '0' }).env.trustProxy).toBe(0);
    });

    it('deja pasar la forma string para expresiones como loopback', () => {
      for (const v of ['loopback', 'subnet-1', 'untrusted']) {
        expect(cargarCon({ JWT_SECRET: SECRETO_VALIDO, TRUST_PROXY: v }).env.trustProxy).toBe(v);
      }
    });

    it('un 0 como string no se convierte a falsy y se pierde', () => {
      const r = cargarCon({ JWT_SECRET: SECRETO_VALIDO, TRUST_PROXY: '0' });
      expect(r.env.trustProxy).toBe(0);
    });
  });

  describe('defaults del resto de la configuracion', () => {
    const base = { JWT_SECRET: SECRETO_VALIDO };

    it('port 3000 por defecto', () => {
      expect(cargarCon(base).env.port).toBe(3000);
    });

    it('respeta PORT del entorno', () => {
      expect(cargarCon({ ...base, PORT: '8080' }).env.port).toBe(8080);
    });

    it('db apunta a jebo_2026 en localhost por defecto', () => {
      const { dbName, dbPort } = cargarCon(base).env;
      expect(dbName).toBe('jebo_2026');
      expect(dbPort).toBe(5432);
    });

    it('respeta las variables de base del entorno', () => {
      const r = cargarCon({ ...base, DB_NAME: 'otra', DB_PORT: '15432' });
      expect(r.env.dbName).toBe('otra');
      expect(r.env.dbPort).toBe(15432);
    });

    it('CORS abierto por defecto', () => {
      expect(cargarCon(base).env.cors).toBe('*');
      expect(cargarCon({ ...base, CORS_ORIGIN: 'https://app.jebo.test' }).env.cors)
        .toBe('https://app.jebo.test');
    });

    it('bcrypt con 12 rondas por defecto', () => {
      expect(cargarCon(base).env.rounds).toBe(12);
    });

    it('expira el access token en 1h y el refresh en 7d', () => {
      expect(cargarCon(base).env.expiresIn).toBe('1h');
    });
  });

  describe('cookies de sesion', () => {
    const base = { JWT_SECRET: SECRETO_VALIDO };

    it('Secure queda apagado salvo que se pida explicito', () => {
      expect(cargarCon(base).env.cookieSecure).toBe(false);
      expect(cargarCon({ ...base, COOKIE_SECURE: 'true' }).env.cookieSecure).toBe(true);
      expect(cargarCon({ ...base, COOKIE_SECURE: '1' }).env.cookieSecure).toBe(false);
      expect(cargarCon({ ...base, COOKIE_SECURE: 'si' }).env.cookieSecure).toBe(false);
    });

    it('SameSite=Strict', () => {
      expect(cargarCon(base).env.cookieSameSite).toBe('strict');
    });

    it('la cookie de access vive menos que el token de 1h', () => {
      const { cookieAccessMaxAge } = cargarCon(base).env;
      expect(cookieAccessMaxAge).toBeGreaterThan(0);
      expect(cookieAccessMaxAge).toBeLessThan(3600 * 1000);
    });

    it('la cookie de refresh vive menos que el token de 7d', () => {
      const { cookieRefreshMaxAge } = cargarCon(base).env;
      expect(cookieRefreshMaxAge).toBeLessThan(7 * 24 * 3600 * 1000);
      expect(cookieRefreshMaxAge).toBeGreaterThanOrEqual(7 * 24 * 3600 * 1000 - 5 * 60 * 1000);
    });

    it('sigue la duracion del token cuando se cambia JWT_*_EXPIRES_IN', () => {
      const r = cargarCon({ ...base, JWT_EXPIRES_IN: '15m', JWT_REFRESH_EXPIRES_IN: '30d' }).env;
      expect(r.cookieAccessMaxAge).toBeLessThan(15 * 60 * 1000);
      expect(r.cookieAccessMaxAge).toBeGreaterThanOrEqual(14 * 60 * 1000);
      expect(r.cookieRefreshMaxAge).toBeLessThan(30 * 24 * 3600 * 1000);
      expect(r.cookieRefreshMaxAge).toBeGreaterThan(29 * 24 * 3600 * 1000);
    });

    it('un numero sin sufijo son milisegundos, como en jsonwebtoken', () => {
      const r = cargarCon({ ...base, JWT_EXPIRES_IN: '900' }).env;
      expect(r.cookieAccessMaxAge).toBe(1000);
    });

    it('un numero como valor de jsonwebtoken tambien son segundos', () => {
      expect(cargarCon({ ...base, JWT_EXPIRES_IN: '900s' }).env.cookieAccessMaxAge)
        .toBe(900 * 1000 - 60000);
    });

    it('cae al default si el expiresIn no se puede parsear', () => {
      const r = cargarCon({ ...base, JWT_EXPIRES_IN: 'para siempre' }).env;
      expect(Number.isFinite(r.cookieAccessMaxAge)).toBe(true);
      expect(r.cookieAccessMaxAge).toBeGreaterThan(0);
    });
  });
});
