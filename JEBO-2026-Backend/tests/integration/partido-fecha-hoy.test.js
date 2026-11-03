/**
 * La fecha de "hoy" para arrancar un partido sale de la base, no del reloj de
 * Node ni de `CURRENT_DATE`.
 *
 * Este suite es el unico que ejecuta el SQL real de `fechaDeHoy`, asi que es
 * el que protege el error de zona horaria. Los tests unitarios mockean el
 * repositorio y no lo verian pasar.
 *
 * El problema concreto que previene: el contenedor de la API y la sesion de
 * Postgres corren en UTC, y Argentina es UTC-3. Entre las 21:00 y las 24:00,
 * un `new Date()` o un `CURRENT_DATE` ya devuelven el dia SIGUIENTE, con lo
 * cual el partido programado para HOY se rechazaria todas las noches, justo en
 * la franja en la que se juega.
 *
 * El SQL usa `AT TIME ZONE 'America/Argentina/Buenos_Aires'`, que devuelve el
 * calendario del partido con independencia de la zona de la sesion. Eso se
 * comprueba aqui moviendo la sesion a una zona que SI cruza la fecha: si
 * alguien volviera a `CURRENT_DATE`, este test falla.
 */

// El setup global (tests/setup.js) deja DB_NAME en jebo_2026_test y el puerto
// correcto antes de que se cargue este archivo.
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
    // Este es el corazon del test. Se pone la sesion en UTC+14, que es la zona
    // mas adelantada del mundo: si el calculo usara la zona de la sesion,
    // `hoy` seria un dia posterior al de Argentina casi todas las noches. Con
    // `AT TIME ZONE` el resultado no se mueve.
    const antes = await PartidoRepository.fechaDeHoy();

    await knex.raw("SET TIME ZONE 'Pacific/Kiritimati'"); // UTC+14
    try {
      const despues = await PartidoRepository.fechaDeHoy();

      expect(despues).toBe(antes);
    } finally {
      await knex.raw("SET TIME ZONE 'UTC'");
    }
  });

  it('es estable al repetir la lectura', async () => {
    // idempotencia: leer la fecha varias veces en la misma sesion da lo mismo,
    // asi que arrancar dos partidos seguidos no puede dar dos fechas distintas.
    const [a, b] = await Promise.all([
      PartidoRepository.fechaDeHoy(),
      PartidoRepository.fechaDeHoy()
    ]);

    expect(a).toBe(b);
  });
});
