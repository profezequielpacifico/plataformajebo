jest.mock('../../src/services/tokenRevocacion.service', () => ({ sesionVigente: jest.fn() }));
jest.mock('../../src/services/alcance.service', () => ({ resolver: jest.fn() }));

const tokenRevocacion = require('../../src/services/tokenRevocacion.service');
const alcanceService = require('../../src/services/alcance.service');
const { authenticate } = require('../../src/middleware/auth');
const { signAccessToken } = require('../../src/config/jwt');
const { UnauthorizedError } = require('../../src/utils/errors');

const correr = async (headers) => {
  const next = jest.fn();
  await authenticate({ headers, cookies: {} }, {}, next);
  return next.mock.calls[0][0];
};

describe('authenticate distingue un token malo de una falla de infraestructura', () => {
  const bearer = () => ({ authorization: `Bearer ${signAccessToken({ id: 1, rol: 'Profesor' })}` });

  beforeEach(() => {
    tokenRevocacion.sesionVigente.mockReset().mockResolvedValue(true);
    alcanceService.resolver.mockReset().mockResolvedValue({ global: false, instituciones: [] });
  });

  it('un token invalido sigue siendo 401', async () => {
    expect(await correr({ authorization: 'Bearer falso' })).toBeInstanceOf(UnauthorizedError);
  });

  it('un token revocado sigue siendo 401', async () => {
    tokenRevocacion.sesionVigente.mockResolvedValue(false);
    expect(await correr(bearer())).toBeInstanceOf(UnauthorizedError);
  });

  it('un timeout del pool al consultar la revocacion no se informa como sesion invalida', async () => {
    const falla = new Error('Knex: Timeout acquiring a connection');
    tokenRevocacion.sesionVigente.mockRejectedValue(falla);
    expect(await correr(bearer())).toBe(falla);
  });

  it('una falla al resolver el alcance no se informa como sesion invalida', async () => {
    const falla = new Error('connection terminated');
    alcanceService.resolver.mockRejectedValue(falla);
    expect(await correr(bearer())).toBe(falla);
  });

  it('consulta la vigencia con los claims del token', async () => {
    await correr(bearer());
    expect(tokenRevocacion.sesionVigente).toHaveBeenCalledWith(expect.objectContaining({ id: 1, jti: expect.any(String) }));
  });

  it('un token valido pasa sin error', async () => {
    expect(await correr(bearer())).toBeUndefined();
  });
});
