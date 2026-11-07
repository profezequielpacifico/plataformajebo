jest.mock('../../src/config/knex', () => {
  const consulta = {
    where: jest.fn().mockReturnThis(),
    first: jest.fn(),
    del: jest.fn()
  };
  const knex = jest.fn(() => consulta);
  knex.consulta = consulta;
  knex.fn = { now: jest.fn() };
  return knex;
});

const knex = require('../../src/config/knex');
const { estaRevocado } = require('../../src/services/tokenRevocacion.service');

describe('estaRevocado con varios workers', () => {
  beforeEach(() => {
    knex.mockClear();
    knex.consulta.first.mockReset();
  });

  it('no recuerda el "no": otro worker pudo revocar el token recien', async () => {
    knex.consulta.first.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ jti: 'a' });
    await expect(estaRevocado('a')).resolves.toBe(false);
    await expect(estaRevocado('a')).resolves.toBe(true);
    expect(knex).toHaveBeenCalledTimes(2);
  });

  it('recuerda el "si" y no vuelve a consultar', async () => {
    knex.consulta.first.mockResolvedValueOnce({ jti: 'b' });
    await expect(estaRevocado('b')).resolves.toBe(true);
    await expect(estaRevocado('b')).resolves.toBe(true);
    expect(knex).toHaveBeenCalledTimes(1);
  });
});
