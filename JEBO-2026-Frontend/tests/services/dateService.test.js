import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  hoyArgentina,
  instanteAFechaHoraArgentina,
  fechaHoraArgentinaAInstante,
  formatearFecha
} from '../../src/services/dateService.js';

describe('dateService en America/Argentina/Buenos_Aires', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  describe.each(['America/Argentina/Buenos_Aires', 'UTC', 'Asia/Tokyo', 'America/New_York'])('con el navegador en %s', (zona) => {
    it('convierte la hora cargada al instante correcto', () => {
      vi.stubEnv('TZ', zona);
      expect(fechaHoraArgentinaAInstante('2026-11-04T00:00')).toBe('2026-11-04T03:00:00.000Z');
    });

    it('convierte el instante guardado a la hora de Argentina', () => {
      vi.stubEnv('TZ', zona);
      expect(instanteAFechaHoraArgentina('2026-11-04T03:00:00.000Z')).toBe('2026-11-04T00:00');
    });

    it('calcula el dia de hoy en Argentina', () => {
      vi.stubEnv('TZ', zona);
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-11-07T02:59:00.000Z'));
      expect(hoyArgentina()).toBe('2026-11-06');
      vi.setSystemTime(new Date('2026-11-07T03:00:00.000Z'));
      expect(hoyArgentina()).toBe('2026-11-07');
    });
  });

  it('ida y vuelta conserva lo cargado', () => {
    const cargado = '2026-12-31T23:59';
    expect(instanteAFechaHoraArgentina(fechaHoraArgentinaAInstante(cargado))).toBe(cargado);
  });

  it('entiende el instante con desplazamiento explicito', () => {
    expect(instanteAFechaHoraArgentina('2026-10-01T08:00:00-03:00')).toBe('2026-10-01T08:00');
  });

  it('la medianoche de Argentina no se muestra como el dia anterior', () => {
    expect(formatearFecha(instanteAFechaHoraArgentina('2026-11-04T03:00:00.000Z'))).toBe('04/11/2026');
  });

  it('formatea una columna DATE sin correr el dia', () => {
    expect(formatearFecha('2026-11-06T00:00:00.000Z')).toBe('06/11/2026');
  });

  it.each([null, '', undefined, 'sin fecha', '2026-11', '2026-11-04'])('no inventa un instante desde lo cargado %s', (valor) => {
    expect(fechaHoraArgentinaAInstante(valor)).toBeNull();
  });

  it.each([null, '', undefined, 'sin fecha'])('no inventa una hora desde lo guardado %s', (valor) => {
    expect(instanteAFechaHoraArgentina(valor)).toBe('');
  });
});
