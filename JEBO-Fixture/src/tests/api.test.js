import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, get } from '../services/api';
import { obtenerFixture } from '../services/fixtureService';

const responder = (status, cuerpo) => vi.fn().mockResolvedValue({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(cuerpo)
});

afterEach(() => vi.unstubAllGlobals());

describe('cliente de la API', () => {
  it('solo hace GET, sin credenciales, y descarta filtros vacíos', async () => {
    const fetch = responder(200, { success: true, data: { eventos: [] } });
    vi.stubGlobal('fetch', fetch);

    await obtenerFixture({ idRegion: 2, idTorneo: undefined, idEtapa: '', estados: ['PROGRAMADO', 'EN_JUEGO'] });

    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('/api/public/fixture?id_region=2&estado=PROGRAMADO%2CEN_JUEGO');
    expect(opciones.method).toBe('GET');
    expect(opciones.credentials).toBe('omit');
  });

  it('devuelve el contenido de data', async () => {
    vi.stubGlobal('fetch', responder(200, { success: true, data: [{ id_region: 1 }] }));
    await expect(get('/regions')).resolves.toEqual([{ id_region: 1 }]);
  });

  it('convierte errores HTTP en ApiError con el mensaje de la API', async () => {
    vi.stubGlobal('fetch', responder(400, { success: false, message: 'estado inválido' }));
    await expect(get('/fixture')).rejects.toMatchObject({ name: 'ApiError', status: 400, message: 'estado inválido' });
  });

  it('informa cuando no hay conexión', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await get('/regions').catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('No se pudo conectar con la API de JEBO');
  });
});
