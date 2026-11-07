const loginLockout = require('../../src/middleware/login-lockout');
const { query: dbQuery } = require('../../src/config/database.js');

describe('login-lockout', () => {
  const SOLO_MIO = "(ip LIKE '10.0.0.%' OR identificador LIKE '%@x.com' OR identificador = 'no-es-un-email')";

  beforeEach(async () => {
    await dbQuery('DELETE FROM login_intentos');
  });

  afterAll(async () => {
    await dbQuery('DELETE FROM login_intentos');
  });

  describe('normalizarEmail', () => {
    it('pasa a minusculas y recorta', () => {
      expect(loginLockout.normalizarEmail('  Ana@Ejemplo.COM ')).toBe('ana@ejemplo.com');
    });

    it('devuelve null para valores que no son email utilizable', () => {
      expect(loginLockout.normalizarEmail('')).toBeNull();
      expect(loginLockout.normalizarEmail('   ')).toBeNull();
      expect(loginLockout.normalizarEmail(null)).toBeNull();
      expect(loginLockout.normalizarEmail(undefined)).toBeNull();
      expect(loginLockout.normalizarEmail(42)).toBeNull();
    });
  });

  describe('registroFallo', () => {
    it('el primer fallo cuenta 1 y no bloquea', async () => {
      const etapa = await loginLockout.registroFallo('a@x.com', '10.0.0.1');

      expect(etapa.indice).toBe(0);
      expect(etapa.permanente).toBe(false);
      expect(etapa.minutos).toBeNull();
    });

    it('cuenta contra la cuenta y contra la IP en la misma peticion', async () => {
      await loginLockout.registroFallo('a@x.com', '10.0.0.1');

      const filas = await dbQuery(
        'SELECT identificador, ip, failures FROM login_intentos ORDER BY ip, identificador'
      );
      const porCuenta = filas.rows.find((r) => r.ip === '');
      const porIp = filas.rows.find((r) => r.ip === '10.0.0.1');

      expect(porCuenta.identificador).toBe('a@x.com');
      expect(porIp.identificador).toBe('ip:10.0.0.1');
      expect(Number(porCuenta.failures)).toBe(1);
      expect(Number(porIp.failures)).toBe(1);
    });

    it('el off-by-one esta arreglado: el INSERT ya arranca en 1', async () => {
      await loginLockout.registroFallo('nuevo@x.com', '10.0.0.9');

      const { rows } = await dbQuery(
        "SELECT failures FROM login_intentos WHERE identificador = 'nuevo@x.com'"
      );
      expect(Number(rows[0].failures)).toBe(1);
    });

    it('acumula sobre la fila existente en lugar de crear una nueva', async () => {
      await loginLockout.registroFallo('b@x.com', '10.0.0.2');
      await loginLockout.registroFallo('b@x.com', '10.0.0.2');

      const { rows } = await dbQuery(
        "SELECT COUNT(*)::int AS n, MAX(failures)::int AS f FROM login_intentos WHERE identificador = 'b@x.com'"
      );
      expect(rows[0].n).toBe(1);
      expect(rows[0].f).toBe(2);
    });

    it('sube de etapa a los 5 fallos y bloquea 5 minutos', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('c@x.com', '10.0.0.3');

      const e = await loginLockout.estadoBloqueo('c@x.com', '10.0.0.3');
      expect(e.bloqueado).toBe(true);
      expect(e.permanente).toBe(false);
      expect(e.etapa).toBe(1);
      expect(e.mensaje).toMatch(/5 minutos/);
      expect(e.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('escala a 15 y luego 30 minutos con los umbrales intermedios', async () => {
      for (let i = 0; i < 8; i++) await loginLockout.registroFallo('d@x.com', '10.0.0.4');
      let e = await loginLockout.estadoBloqueo('d@x.com', '10.0.0.4');
      expect(e.etapa).toBe(2);
      expect(e.mensaje).toMatch(/15 minutos/);

      for (let i = 0; i < 3; i++) await loginLockout.registroFallo('d@x.com', '10.0.0.4');
      e = await loginLockout.estadoBloqueo('d@x.com', '10.0.0.4');
      expect(e.etapa).toBe(3);
      expect(e.mensaje).toMatch(/30 minutos/);
    });

    it('a los 14 fallos pasa a bloqueo permanente y no admite expires', async () => {
      for (let i = 0; i < 14; i++) await loginLockout.registroFallo('e@x.com', '10.0.0.5');

      const e = await loginLockout.estadoBloqueo('e@x.com', '10.0.0.5');
      expect(e.permanente).toBe(true);
      expect(e.bloqueado).toBe(true);
      expect(e.retryAfterSeconds).toBeNull();
      expect(e.mensaje).toMatch(/Comuniquese con el servicio tecnico/);

      const { rows } = await dbQuery(
        "SELECT permanente, locked_until FROM login_intentos WHERE identificador = 'e@x.com'"
      );
      expect(rows[0].permanente).toBe(true);
      expect(rows[0].locked_until).toBeNull();
    });

    it('sin identificador solo cuenta la IP', async () => {
      await loginLockout.registroFallo('', '10.0.0.6');

      const { rows } = await dbQuery(
        "SELECT identificador, ip FROM login_intentos WHERE ip = '10.0.0.6'"
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].identificador).toBe('ip:10.0.0.6');
    });

    it('un string no vacio se usa tal cual como identificador', async () => {
      await loginLockout.registroFallo('no-es-un-email', '10.0.0.7');

      const { rows } = await dbQuery(
        `SELECT identificador FROM login_intentos WHERE ${SOLO_MIO} ORDER BY ip`
      );
      expect(rows.map((r) => r.identificador)).toEqual(['no-es-un-email', 'ip:10.0.0.7']);
    });

    it('sin IP solo cuenta la cuenta', async () => {
      await loginLockout.registroFallo('f@x.com', null);

      const { rows } = await dbQuery(
        `SELECT identificador, ip FROM login_intentos WHERE ${SOLO_MIO}`
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].identificador).toBe('f@x.com');
      expect(rows[0].ip).toBe('');
    });
  });

  describe('estadoBloqueo', () => {
    it('devuelve null cuando no hay filas', async () => {
      expect(await loginLockout.estadoBloqueo('nunca@x.com', '10.0.0.7')).toBeNull();
    });

    it('no bloquea con pocos fallos', async () => {
      await loginLockout.registroFallo('g@x.com', '10.0.0.8');

      const e = await loginLockout.estadoBloqueo('g@x.com', '10.0.0.8');
      expect(e.bloqueado).toBe(false);
      expect(e.mensaje).toBeNull();
      expect(e.etapa).toBe(0);
    });

    it('la cuenta manda cuando tiene mas fallos que la IP', async () => {
      for (let i = 0; i < 6; i++) await loginLockout.registroFallo('h@x.com', '10.0.0.10');
      await loginLockout.registroFallo('otra-cuenta@x.com', '10.0.0.99');

      const e = await loginLockout.estadoBloqueo('h@x.com', '10.0.0.10');
      expect(e.alcance).toBe('cuenta');
      expect(e.failures).toBe(6);
    });

    it('la IP con 6 fallos NO bloquea: su umbral es 20, no el de la cuenta', async () => {
      for (let i = 0; i < 6; i++) await loginLockout.registroFallo(`saco${i}@x.com`, '10.0.0.11');

      const e = await loginLockout.estadoBloqueo('saco0@x.com', '10.0.0.11');

      expect(e.bloqueado).toBe(false);
      expect(e.alcance).toBe('cuenta');
      expect(e.failures).toBe(1);
    });

    it('la IP manda cuando supera SU umbral de 20', async () => {
      for (let i = 0; i < 20; i++) await loginLockout.registroFallo(`bomb${i}@x.com`, '10.0.0.13');

      const e = await loginLockout.estadoBloqueo('bomb0@x.com', '10.0.0.13');

      expect(e.bloqueado).toBe(true);
      expect(e.alcance).toBe('ip');
      expect(e.failures).toBe(20);
    });

    it('la cuenta bloqueada a 5 manda sobre una IP con 6 fallos', async () => {
      for (let i = 0; i < 6; i++) await loginLockout.registroFallo(`ip6_${i}@x.com`, '10.0.0.14');
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('cuenta5@x.com', '10.0.0.15');

      const e = await loginLockout.estadoBloqueo('cuenta5@x.com', '10.0.0.15');

      expect(e.bloqueado).toBe(true);
      expect(e.alcance).toBe('cuenta');
      expect(e.failures).toBe(5);
    });

    it('marca expirado cuando el locked_until ya paso', async () => {
      await dbQuery(
        `INSERT INTO login_intentos (identificador, ip, failures, locked_until)
         VALUES ('viejo@x.com', '', 5, now() - interval '1 hour')`
      );

      const e = await loginLockout.estadoBloqueo('viejo@x.com', '10.0.0.12');
      expect(e.bloqueado).toBe(false);
      expect(e.expirado).toBe(true);
      expect(e.mensaje).toBeNull();
    });
  });

  describe('limpieza', () => {
    it('limpiarEstado borra la fila de cuenta', async () => {
      await loginLockout.registroFallo('i@x.com', '10.0.0.13');
      await loginLockout.limpiarEstado('i@x.com', '10.0.0.13');

      const { rows } = await dbQuery("SELECT ip FROM login_intentos WHERE identificador = 'i@x.com'");
      expect(rows).toHaveLength(0);
    });

    it('limpiarPorIdentificador borra la cuenta y su fila de IP', async () => {
      await loginLockout.registroFallo('j@x.com', '10.0.0.14');
      const borrados = await loginLockout.limpiarPorIdentificador('J@X.COM');

      expect(borrados).toBe(1);
      const { rows } = await dbQuery(`SELECT 1 FROM login_intentos WHERE ${SOLO_MIO}`);
      expect(rows).toHaveLength(1);
    });

    it('limpiarPorIdentificador con valor vacio no toca nada', async () => {
      await loginLockout.registroFallo('k@x.com', '10.0.0.15');
      expect(await loginLockout.limpiarPorIdentificador('')).toBe(0);
      expect(await loginLockout.limpiarPorIdentificador(null)).toBe(0);
    });

    it('limpiarPorIp borra solo esa IP', async () => {
      await loginLockout.registroFallo('l@x.com', '10.0.0.16');
      await loginLockout.registroFallo('m@x.com', '10.0.0.17');

      expect(await loginLockout.limpiarPorIp('10.0.0.16')).toBe(1);
      const { rows } = await dbQuery(
        `SELECT identificador FROM login_intentos WHERE ${SOLO_MIO}`
      );
      expect(rows.map((r) => r.identificador).sort()).toEqual(['ip:10.0.0.17', 'l@x.com', 'm@x.com']);
    });

    it('limpiarPorIp con valor vacio no toca nada', async () => {
      expect(await loginLockout.limpiarPorIp('')).toBe(0);
      expect(await loginLockout.limpiarPorIp(null)).toBe(0);
    });

    it('limpiarTodo vacia la tabla', async () => {
      await loginLockout.registroFallo('n@x.com', '10.0.0.18');
      await loginLockout.limpiarTodo();

      const { rows } = await dbQuery('SELECT 1 FROM login_intentos');
      expect(rows).toHaveLength(0);
    });
  });

  describe('listar', () => {
    it('devuelve una fila por clave con el alcance deducido del sentinel', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('o@x.com', '10.0.0.19');

      const lista = await loginLockout.listar();
      const porCuenta = lista.find((r) => r.identificador === 'o@x.com');
      const porIp = lista.find((r) => r.identificador === 'ip:10.0.0.19');

      expect(porCuenta.alcance).toBe('cuenta');
      expect(porCuenta.ip).toBeNull();
      expect(porIp.alcance).toBe('ip');
      expect(porIp.ip).toBe('10.0.0.19');
    });

    it('expone el estado de bloqueo con el mensaje de la etapa', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('p@x.com', '10.0.0.20');

      const fila = (await loginLockout.listar()).find((r) => r.identificador === 'p@x.com');
      expect(fila.bloqueado).toBe(true);
      expect(fila.expirado).toBe(false);
      expect(fila.etapa).toBe(1);
      expect(fila.mensaje).toMatch(/5 minutos/);
      expect(fila.locked_until).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('ordena por failures descendente', async () => {
      for (let i = 0; i < 3; i++) await loginLockout.registroFallo('q@x.com', '10.0.0.21');
      await loginLockout.registroFallo('r@x.com', '10.0.0.22');

      const lista = await loginLockout.listar();
      const failures = lista.map((r) => Number(r.failures));
      expect(failures).toEqual([...failures].sort((a, b) => b - a));
    });
  });

  describe('middleware loginLockout', () => {
    const resFalso = () => {
      const res = { status: jest.fn(), json: jest.fn() };
      res.status.mockReturnValue(res);
      return res;
    };

    it('deja pasar cuando no hay bloqueo', async () => {
      const next = jest.fn();
      const res = resFalso();
      await loginLockout({ body: { email: 'libre@x.com' }, ip: '10.0.0.23' }, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('corta con 429 cuando la cuenta esta bloqueada', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('bloq@x.com', '10.0.0.24');

      const next = jest.fn();
      const res = resFalso();
      await loginLockout({ body: { email: 'bloq@x.com' }, ip: '10.0.0.24' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      const cuerpo = res.json.mock.calls[0][0];
      expect(cuerpo.success).toBe(false);
      expect(cuerpo.bloqueoPermanente).toBe(false);
      expect(cuerpo.etapa).toBe(1);
    });

    it('marca bloqueoPermanente cuando la cuenta es permanente', async () => {
      for (let i = 0; i < 14; i++) await loginLockout.registroFallo('perm@x.com', '10.0.0.25');

      const next = jest.fn();
      const res = resFalso();
      await loginLockout({ body: { email: 'perm@x.com' }, ip: '10.0.0.25' }, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json.mock.calls[0][0].bloqueoPermanente).toBe(true);
    });

    it('los rebotes 429 NO escalan la cuenta a bloqueo permanente', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('dos@x.com', '10.0.0.27');

      for (let i = 0; i < 200; i++) {
        await loginLockout({ body: { email: 'dos@x.com' }, ip: '10.0.0.27' }, resFalso(), jest.fn());
      }

      const e = await loginLockout.estadoBloqueo('dos@x.com', '10.0.0.27');
      expect(e.bloqueado).toBe(true);
      expect(e.permanente).toBe(false);
      expect(e.failures).toBe(5);
    });

    const vencida = (identificador, ip) => dbQuery(
      `UPDATE login_intentos SET locked_until = now() - interval '1 minute'
        WHERE identificador = $1 AND ip = $2`,
      [identificador, ip]
    );

    it('la escalera avanza al expirar la ventana, sin ayuda del gate', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('esc@x.com', '10.0.0.28');
      expect((await loginLockout.estadoBloqueo('esc@x.com', '10.0.0.28')).etapa).toBe(1);

      await vencida('esc@x.com', '');

      const next = jest.fn();
      await loginLockout({ body: { email: 'esc@x.com' }, ip: '10.0.0.28' }, resFalso(), next);
      expect(next).toHaveBeenCalled();

      for (let i = 0; i < 3; i++) await loginLockout.registroFallo('esc@x.com', '10.0.0.28');

      const e = await loginLockout.estadoBloqueo('esc@x.com', '10.0.0.28');
      expect(e.etapa).toBe(2);
      expect(e.mensaje).toMatch(/15 minutos/);
    });

    it('no explota si el request no trae body', async () => {
      const next = jest.fn();
      const res = resFalso();
      await loginLockout({ ip: '10.0.0.26' }, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('propaga el error con next', async () => {
      const next = jest.fn();
      const res = resFalso();
      const req = {
        ip: '10.0.0.27',
        get body() { throw new Error('boom'); }
      };
      await loginLockout(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    });
  });

  describe('getStatus', () => {
    const resFalso = () => {
      const res = { status: jest.fn(), json: jest.fn() };
      res.status.mockReturnValue(res);
      return res;
    };

    it('responde sin bloqueo cuando no hay filas', async () => {
      const next = jest.fn();
      const res = resFalso();
      await loginLockout.getStatus({ query: { email: 'nuevo@x.com' }, ip: '10.0.0.28' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].data).toMatchObject({ bloqueado: false, etapa: 0 });
    });

    it('responde con el estado real de una cuenta bloqueada', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('st@x.com', '10.0.0.29');

      const res = resFalso();
      await loginLockout.getStatus({ query: { email: 'st@x.com' }, ip: '10.0.0.29' }, res, jest.fn());

      const data = res.json.mock.calls[0][0].data;
      expect(data.bloqueado).toBe(true);
      expect(data.alcance).toBe('cuenta');
    });

    it('no explota si el request no trae query', async () => {
      const next = jest.fn();
      const res = resFalso();
      await loginLockout.getStatus({ ip: '10.0.0.30' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json.mock.calls[0][0].data.bloqueado).toBe(false);
    });
  });

  describe('estado (alias)', () => {
    it('delega en estadoBloqueo', async () => {
      for (let i = 0; i < 5; i++) await loginLockout.registroFallo('alias@x.com', '10.0.0.31');
      const e = await loginLockout.estado('alias@x.com', '10.0.0.31');
      expect(e.bloqueado).toBe(true);
    });
  });
});
