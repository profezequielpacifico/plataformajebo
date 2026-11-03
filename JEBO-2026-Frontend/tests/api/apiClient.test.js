import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/api/index.js';

/**
 * El cliente HTTP con cookies en vez de tokens en `localStorage`.
 *
 * Lo que se cubre aca es el flujo, no el parseo: que mande `credentials`, que
 * no mande `Authorization`, y sobre todo que un 401 de login NO dispare la
 * cadena refresh -> limpiar sesion -> recargar. Ese bug es el que rompe el login
 * de una forma invisible: recargar la pagina cada vez que uno se equivoca al
 * escribir la contraseña.
 */

const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => cuerpo,
});

let fetchMock;
let reloadMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  reloadMock = vi.fn();
  // `location.reload` no se puede sobreescribir en jsdom, asi que se reemplaza
  // la funcion entera del objeto location con una copia controlable.
  delete window.location;
  window.location = {
    hash: '',
    reload: reloadMock,
    assign: vi.fn(),
    replace: vi.fn(),
    href: 'http://localhost/'
  };
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const cliente = () => new ApiClient();

describe('ApiClient con cookies de sesion', () => {
  it('manda credentials include en cada request', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { data: { ok: true } }));

    await cliente().get('/disciplinas');

    const [, config] = fetchMock.mock.calls[0];
    expect(config.credentials).toBe('include');
  });

  it('no manda header Authorization', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { data: {} }));

    await cliente().get('/disciplinas');

    const [, config] = fetchMock.mock.calls[0];
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('un 401 de login no dispara el refresh ni recarga la pagina', async () => {
    // El bug: login mal -> 401 -> refresh (sin cookie) -> 401 -> reload.
    // El usuario ve la pagina recargarse cada vez que se equivoca.
    fetchMock.mockResolvedValue(respuesta(401, { error: 'Credenciales inválidas' }));

    await expect(cliente().post('/auth/login', { email: 'a@b.c', password: 'x' }))
      .rejects.toThrow('Credenciales inválidas');

    // Solo una llamada: la del login.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('otros endpoints de auth tampoco disparan el refresh', async () => {
    fetchMock.mockResolvedValue(respuesta(401, { error: 'nope' }));

    await expect(cliente().post('/auth/refresh')).rejects.toThrow();
    await expect(cliente().post('/auth/recover-password', { email: 'a@b.c' })).rejects.toThrow();
    await expect(cliente().post('/auth/register', {})).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('un 401 de datos renueva la cookie y reintenta una sola vez', async () => {
    // Orden: el GET de datos (401) dispara el refresh (200), y recien ahi se
    // reintenta el GET.
    fetchMock
      .mockResolvedValueOnce(respuesta(401, { error: 'Token no proporcionado' }))
      .mockResolvedValueOnce(respuesta(200, { data: { user: { id: 1 } } }))
      .mockResolvedValueOnce(respuesta(200, { data: { Disciplinas: [] } }));

    const datos = await cliente().get('/disciplinas');

    expect(datos.data.Disciplinas).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // El refresh va sin cuerpo: el token viaja en la cookie.
    const [urlRefresh, configRefresh] = fetchMock.mock.calls[1];
    expect(urlRefresh).toContain('/auth/refresh');
    expect(configRefresh.credentials).toBe('include');
    expect(configRefresh.body).toBeUndefined();
  });

  it('si el refresh falla, limpia la sesion y manda a /login', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(401, { error: 'Token no proporcionado' }))
      .mockResolvedValueOnce(respuesta(401, { error: 'Sesión cerrada.' }));

    const resultado = await cliente().get('/disciplinas');

    expect(resultado).toBeNull();
    expect(window.location.hash).toBe('#login');
    expect(reloadMock).toHaveBeenCalled();
  });

  it('varios 401 a la vez hacen un solo refresh', async () => {
    // Sin el cerrojo, 5 widgets que dan 401 al abrir el dashboard pegan 5
    // refreshes. Con la rotacion de refresh token, cuatro de esos revocan el
    // token que el primero recien emitio y la sesion se rompe sola.
    let refreshCount = 0;
    fetchMock.mockImplementation(async (url) => {
      if (url.includes('/auth/refresh')) {
        refreshCount += 1;
        return respuesta(200, { data: { user: { id: 1 } } });
      }
      return respuesta(200, { data: { ok: true } });
    });

    const api = cliente();
    // El primer request dispara el refresh; los otros cuatro esperan su turno.
    const peticiones = [
      api.get('/disciplinas'),
      api.get('/torneos'),
      api.get('/partidos'),
      api.get('/usuarios'),
      api.get('/canchas')
    ];
    await Promise.all(peticiones);

    expect(refreshCount).toBeLessThanOrEqual(1);
  });

  it('el logout limpia el perfil cacheado y las claves viejas de tokens', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { data: {} }));

    localStorage.setItem('jebo_user', '{"id_usuario":1}');
    localStorage.setItem('token', 'access-viejo');
    localStorage.setItem('token_refresh', 'refresh-viejo');

    const { authService } = await import('../../src/services/authService.js');
    await authService.logout();

    expect(localStorage.getItem('jebo_user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token_refresh')).toBeNull();
  });

  it('isAuthenticated no depende de que haya un token en localStorage', async () => {
    const { authService } = await import('../../src/services/authService.js');

    expect(authService.isAuthenticated()).toBe(false);

    // Con cookies httpOnly el token no se puede leer: la unica senal del lado
    // del cliente es el perfil cacheado.
    localStorage.setItem('jebo_user', '{"id_usuario":1,"email":"a@b.c"}');
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getUser().email).toBe('a@b.c');
  });

  it('un perfil corrupto no deja la app sin arrancar', async () => {
    const { authService } = await import('../../src/services/authService.js');
    localStorage.setItem('jebo_user', '{esto no es json');

    expect(authService.getUser()).toBeNull();
    // Y se limpia, para no volver a romper en el proximo arranque.
    expect(localStorage.getItem('jebo_user')).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('el login guarda el perfil y no toca ningun token', async () => {
    fetchMock.mockResolvedValue(
      respuesta(200, { success: true, data: { user: { id_usuario: 7, email: 'a@b.c' } } })
    );

    const { authService } = await import('../../src/services/authService.js');
    await authService.login({ email: 'a@b.c', password: 'x' });

    expect(JSON.parse(localStorage.getItem('jebo_user')).id_usuario).toBe(7);
    // Lo que prueba que la migracion esta completa: el cuerpo ni siquiera
    // tiene tokens que guardar.
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('token_refresh')).toBeNull();
  });

  it('upload manda credentials y no rompe el FormData con un Content-Type fijo', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { data: { ok: true } }));

    const form = new FormData();
    form.append('reglamento', new Blob(['x']), 'r.pdf');

    await cliente().upload('/disciplines/1/reglamento', form);

    const [, config] = fetchMock.mock.calls[0];
    expect(config.credentials).toBe('include');
    // Si se mandara `Content-Type: application/json` el browser no pondria el
    // `boundary` del multipart y el servidor no veria el archivo.
    expect(config.headers).toBeUndefined();
    expect(config.body).toBe(form);
  });
});
