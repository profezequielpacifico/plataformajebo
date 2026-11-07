const knex = require('../../src/config/knex');
const { PartidoRepository } = require('../../src/repositories');

describe('partido.repository.fechaDeHoy', () => {
  afterAll(async () => {
    await knex.destroy();
  });

  it('devuelve la fecha de hoy como YYYY-MM-DD', async () => {
    const hoy = await PartidoRepository.fechaDeHoy();

    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('coincide con el calendario de Argentina, no con el de UTC', async () => {
    const { rows: esperado } = await knex.raw(
      "SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date::text AS hoy"
    );

    expect(await PartidoRepository.fechaDeHoy()).toBe(esperado[0].hoy);
  });

  it('no se corre aunque la sesion este en una zona que cruza la fecha', async () => {
    const antes = await PartidoRepository.fechaDeHoy();

    await knex.raw("SET TIME ZONE 'Pacific/Kiritimati'");
    try {
      const despues = await PartidoRepository.fechaDeHoy();

      expect(despues).toBe(antes);
    } finally {
      await knex.raw("SET TIME ZONE 'UTC'");
    }
  });

  it('es estable al repetir la lectura', async () => {
    const [a, b] = await Promise.all([
      PartidoRepository.fechaDeHoy(),
      PartidoRepository.fechaDeHoy()
    ]);

    expect(a).toBe(b);
  });
});
