const loginLockoutController = require('../../src/controllers/login-lockout.controller');
const loginLockout = require('../../src/middleware/login-lockout');
const bitacoraService = require('../../src/services/bitacora.service');
const { HTTP_STATUS } = require('../../src/constants');

jest.mock('../../src/middleware/login-lockout', () => ({
  listar: jest.fn(),
  limpiarPorIdentificador: jest.fn(),
  limpiarPorIp: jest.fn()
}));
jest.mock('../../src/services/bitacora.service', () => ({ log: jest.fn() }));

describe('login-lockout.controller', () => {
  const reqFalso = (params = {}, extra = {}) => ({
    params,
    ip: '10.0.0.1',
    headers: { 'user-agent': 'jest' },
    user: { id: 1 },
    ...extra
  });

  const resFalso = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  };

  const cuerpoDe = (res) => res.json.mock.calls[0][0];

  beforeEach(() => jest.clearAllMocks());

  describe('listar', () => {
    it('devuelve la lista de bloqueos', async () => {
      const filas = [{ identificador: 'a@b.com', failures: 5 }];
      loginLockout.listar.mockResolvedValue(filas);
      const res = resFalso();

      await loginLockoutController.listar(reqFalso(), res, jest.fn());

      expect(loginLockout.listar).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(cuerpoDe(res).data).toEqual(filas);
    });

    it('propaga el error con next', async () => {
      loginLockout.listar.mockRejectedValue(new Error('tabla caida'));
      const next = jest.fn();

      await loginLockoutController.listar(reqFalso(), resFalso(), next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'tabla caida' }));
    });
  });

  describe('desbloquear', () => {
    it('trata un email como identificador de cuenta', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(2);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: 'Bloqueado@Ejemplo.COM' }), res, jest.fn());

      expect(loginLockout.limpiarPorIdentificador).toHaveBeenCalledWith('bloqueado@ejemplo.com');
      expect(loginLockout.limpiarPorIp).not.toHaveBeenCalled();
      expect(cuerpoDe(res).data.alcance).toBe('cuenta');
    });

    it('trata otra cosa como IP', async () => {
      loginLockout.limpiarPorIp.mockResolvedValue(1);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: '10.0.0.55' }), res, jest.fn());

      expect(loginLockout.limpiarPorIp).toHaveBeenCalledWith('10.0.0.55');
      expect(loginLockout.limpiarPorIdentificador).not.toHaveBeenCalled();
      expect(cuerpoDe(res).data.alcance).toBe('ip');
    });

    it('limpiar por cuenta borra los bloqueos de todas las IP del usuario', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(4);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: 'victima@ejemplo.com' }), res, jest.fn());

      expect(cuerpoDe(res).data.affected).toBe(4);
    });

    it('devuelve el parametro recortado', async () => {
      loginLockout.limpiarPorIp.mockResolvedValue(0);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: '  10.0.0.9  ' }), res, jest.fn());

      expect(loginLockout.limpiarPorIp).toHaveBeenCalledWith('10.0.0.9');
    });

    it('un parametro vacio no rompe', async () => {
      loginLockout.limpiarPorIp.mockResolvedValue(0);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: '' }), res, jest.fn());

      expect(loginLockout.limpiarPorIp).toHaveBeenCalledWith('');
    });

    it('responde 200 aunque no haya filas afectadas', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(0);
      const res = resFalso();

      await loginLockoutController.desbloquear(reqFalso({ ip: 'nadie@ejemplo.com' }), res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(cuerpoDe(res).data.affected).toBe(0);
    });

    it('el mensaje distingue el alcance', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(1);
      let res = resFalso();
      await loginLockoutController.desbloquear(reqFalso({ ip: 'a@b.com' }), res, jest.fn());
      expect(cuerpoDe(res).message).toMatch(/cuenta/);

      loginLockout.limpiarPorIp.mockResolvedValue(1);
      res = resFalso();
      await loginLockoutController.desbloquear(reqFalso({ ip: '10.0.0.1' }), res, jest.fn());
      expect(cuerpoDe(res).message).toMatch(/IP/);
    });

    it('audita el desbloqueo con usuario, ip y user-agent', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(1);
      const req = reqFalso({ ip: 'a@b.com' }, { ip: '172.16.0.9', user: { id: 77 } });

      await loginLockoutController.desbloquear(req, resFalso(), jest.fn());

      expect(bitacoraService.log).toHaveBeenCalledWith(expect.objectContaining({
        userId: 77,
        action: 'DESBLOQUEAR_LOGIN',
        entity: 'Login',
        ip: '172.16.0.9',
        userAgent: 'jest'
      }));
    });

    it('el detalle de la bitacora dice que se levanto', async () => {
      loginLockout.limpiarPorIdentificador.mockResolvedValue(1);
      await loginLockoutController.desbloquear(reqFalso({ ip: 'a@b.com' }), resFalso(), jest.fn());
      expect(bitacoraService.log.mock.calls[0][0].detail).toEqual({ identificador: 'a@b.com' });

      loginLockout.limpiarPorIp.mockResolvedValue(1);
      await loginLockoutController.desbloquear(reqFalso({ ip: '10.0.0.1' }), resFalso(), jest.fn());
      expect(bitacoraService.log.mock.calls[1][0].detail).toEqual({ ip: '10.0.0.1' });
    });

    it('funciona sin user en el request', async () => {
      loginLockout.limpiarPorIp.mockResolvedValue(0);
      const req = reqFalso({ ip: '10.0.0.1' }, { user: undefined });

      await loginLockoutController.desbloquear(req, resFalso(), jest.fn());

      expect(bitacoraService.log.mock.calls[0][0].userId).toBeUndefined();
    });

    it('propaga el error con next', async () => {
      loginLockout.limpiarPorIdentificador.mockRejectedValue(new Error('db caida'));
      const next = jest.fn();

      await loginLockoutController.desbloquear(reqFalso({ ip: 'a@b.com' }), resFalso(), next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'db caida' }));
    });
  });
});
