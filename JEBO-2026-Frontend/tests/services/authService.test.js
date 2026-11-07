import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../../src/services/authService.js';

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

let fetchMock;
let reloadMock;
let locationOriginal;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  reloadMock = vi.fn();
  locationOriginal = window.location;
  delete window.location;
  window.location = { hash: '', reload: reloadMock, href: 'http://localhost/' };
  localStorage.clear();
  localStorage.setItem('jebo_user', '{"id_usuario":1}');
  localStorage.setItem('token', 'access-viejo');
  localStorage.setItem('token_refresh', 'refresh-viejo');
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location = locationOriginal;
});

const llamadas = () => fetchMock.mock.calls.map(([url, cfg]) => `${cfg?.method} ${new URL(url, 'http://x').pathname.replace(/^.*(\/auth\/)/, '$1')}`);

const sesionLimpia = () => {
  expect(localStorage.getItem('jebo_user')).toBeNull();
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('token_refresh')).toBeNull();
};

describe('authService.logout', () => {
  it('hace POST /auth/logout con las cookies y limpia el perfil', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { data: null }));

    await authService.logout();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, cfg] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/logout$/);
    expect(cfg.method).toBe('POST');
    expect(cfg.credentials).toBe('include');
    sesionLimpia();
  });

  it('si la red falla igual limpia localStorage y no rechaza', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(authService.logout()).resolves.toBeUndefined();

    sesionLimpia();
  });

  it('un 401 en el logout no dispara refresh ni recarga la página', async () => {
    fetchMock.mockResolvedValue(respuesta(401, { error: 'No autorizado' }));

    await expect(authService.logout()).resolves.toBeUndefined();

    expect(llamadas()).toEqual(['POST /auth/logout']);
    expect(reloadMock).not.toHaveBeenCalled();
    sesionLimpia();
  });

  it('un error del servidor tampoco deja la sesión cacheada', async () => {
    fetchMock.mockResolvedValue(respuesta(500, { error: 'boom' }));

    await expect(authService.logout()).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
    sesionLimpia();
  });
});
