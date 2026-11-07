jest.mock('../../src/config/knex', () => {
  const consulta = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    del: jest.fn()
  };
  const knex = jest.fn(() => consulta);
  knex.consulta = consulta;
  knex.fn = { now: jest.fn() };
  knex.raw = jest.fn((sql, bindings) => ({ sql, bindings }));
  return knex;
});

const knex = require('../../src/config/knex');
const { sesionVigente } = require('../../src/services/tokenRevocacion.service');

describe('sesionVigente', () => {
  beforeEach(() => {
    knex.mockClear();
    knex.raw.mockClear();
    knex.consulta.where.mockClear();
    knex.consulta.first.mockReset();
  });

  it('acepta un token cuya version coincide y cuyo jti no esta revocado', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 3, revocado: false });
    await expect(sesionVigente({ id: 10, jti: 'j-10', ver: 3 })).resolves.toBe(true);
    expect(knex).toHaveBeenCalledTimes(1);
    expect(knex).toHaveBeenCalledWith('usuario');
    expect(knex.consulta.where).toHaveBeenCalledWith('id_usuario', 10);
    expect(knex.raw.mock.calls[0][1]).toEqual(['j-10']);
  });

  it('rechaza un token emitido antes del logout: la version subio', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 4, revocado: false });
    await expect(sesionVigente({ id: 11, jti: 'j-11', ver: 3 })).resolves.toBe(false);
  });

  it('rechaza un token cuyo jti esta revocado', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 1, revocado: true });
    await expect(sesionVigente({ id: 12, jti: 'j-12', ver: 1 })).resolves.toBe(false);
  });

  it('recuerda el jti revocado y no vuelve a consultar', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 1, revocado: true });
    await sesionVigente({ id: 13, jti: 'j-13', ver: 1 });
    await expect(sesionVigente({ id: 13, jti: 'j-13', ver: 1 })).resolves.toBe(false);
    expect(knex).toHaveBeenCalledTimes(1);
  });

  it('una version ya superada se rechaza sin tocar la base', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 5, revocado: false });
    await sesionVigente({ id: 14, jti: 'j-14a', ver: 5 });
    await expect(sesionVigente({ id: 14, jti: 'j-14b', ver: 4 })).resolves.toBe(false);
    expect(knex).toHaveBeenCalledTimes(1);
  });

  it('no recuerda el "si": otro worker pudo cerrar la sesion recien', async () => {
    knex.consulta.first
      .mockResolvedValueOnce({ token_version: 2, revocado: false })
      .mockResolvedValueOnce({ token_version: 3, revocado: false });
    await expect(sesionVigente({ id: 15, jti: 'j-15', ver: 2 })).resolves.toBe(true);
    await expect(sesionVigente({ id: 15, jti: 'j-15', ver: 2 })).resolves.toBe(false);
    expect(knex).toHaveBeenCalledTimes(2);
  });

  it('rechaza si el usuario ya no existe', async () => {
    knex.consulta.first.mockResolvedValueOnce(undefined);
    await expect(sesionVigente({ id: 16, jti: 'j-16', ver: 1 })).resolves.toBe(false);
  });

  it('rechaza un token sin id sin consultar la base', async () => {
    await expect(sesionVigente({ jti: 'j-17', ver: 1 })).resolves.toBe(false);
    expect(knex).not.toHaveBeenCalled();
  });

  it('un token sin claim ver solo se valida por jti', async () => {
    knex.consulta.first.mockResolvedValueOnce({ token_version: 9, revocado: false });
    await expect(sesionVigente({ id: 18, jti: 'j-18' })).resolves.toBe(true);
  });

  it('propaga una falla de la base en vez de tratarla como sesion cerrada', async () => {
    const falla = new Error('Knex: Timeout acquiring a connection');
    knex.consulta.first.mockRejectedValueOnce(falla);
    await expect(sesionVigente({ id: 19, jti: 'j-19', ver: 1 })).rejects.toBe(falla);
  });
});
