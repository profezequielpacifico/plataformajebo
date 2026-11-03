import { STORAGE_KEYS } from '../config/constants.js';
import ENV from '../config/env.js';

/**
 * Endpoints donde un 401 es una RESPUESTA, no una sesion vencida.
 *
 * `POST /auth/login` devuelve 401 cuando la contraseña está mal. Si eso dispara
 * el reintento con refresh, la cadena es: login mal → refresh sin cookie → 401
 * → `_clearSession()` → recarga de la página. El síntoma para el usuario es que
 * la página se recarga cada vez que se equivoca al escribir la contraseña, y el
 * campo queda vacío. Lo mismo con el resto: son endpoints públicos por
 * definición, no hay sesión que renovar.
 */
const SIN_REFRESH = ['/auth/login', '/auth/refresh', '/auth/recover-password', '/auth/register'];

class ApiClient {
    constructor() {
        this.refreshing = false;
        this.queue = [];
    }

    _buildError(body, status) {
        const err = new Error(body.error || `HTTP Error: ${status}`);
        err.status = status;
        err.retryAfterSeconds = Number.isFinite(body.retryAfterSeconds) ? body.retryAfterSeconds : null;
        err.bloqueoPermanente = !!body.bloqueoPermanente;
        err.etapa = body.etapa ?? null;
        return err;
    }

    get baseUrl() {
        // Prefer relative /api (Vite proxy + nginx in Docker).
        // Absolute VITE_API_URL only when set to a full URL.
        const configured = ENV.API.BASE_URL;
        if (configured && /^https?:\/\//i.test(configured)) {
            return configured.replace(/\/$/, '');
        }
        return '/api';
    }

    /**
     * Cookies de sesión: `credentials: 'include'` es lo que hace que el
     * navegador las mande.
     *
     * No se manda header `Authorization` porque el token ya no existe del lado
     * del cliente: vive en una cookie `httpOnly` que JavaScript no puede leer
     * (ver `src/services/authService.js`). El servidor la toma de
     * `req.cookies.accessToken`.
     *
     * `sameSite: 'strict'` es seguro justamente porque el frontend y la API se
     * sirven desde el mismo origen (nginx hace de proxy de `/api`), así que la
     * cookie se manda en cada request y nunca en un cross-site.
     */
    _config(extra = {}) {
        return {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...extra.headers
            },
            ...extra
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = this._config(options);

        const response = await fetch(url, config);

        if (response.status === 401 && !SIN_REFRESH.some((ruta) => endpoint.startsWith(ruta))) {
            const renovado = await this._tryRefresh();
            if (renovado) {
                const retryResponse = await fetch(url, config);
                if (!retryResponse.ok) {
                    const body = await retryResponse.json().catch(() => ({}));
                    throw this._buildError(body, retryResponse.status);
                }
                return await retryResponse.json();
            }
            this._clearSession();
            return null;
        }

        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw this._buildError(body, response.status);
        }

        return await response.json();
    }

    /**
     * Renueva la sesión con la cookie `refreshToken`.
     *
     * No lleva cuerpo: el token viaja en la cookie. Devuelve `true`/`false` y no
     * el token, porque con cookies el cliente no tiene nada que guardar: lo que
     * importa es saber si el reintento vale la pena.
     *
     * El cerrojo `refreshing` + la cola de resolvers son lo que evita la
     * tormenta de refresh: si 5 requests dan 401 al mismo tiempo (típico al
     * abrir un dashboard con 5 widgets), solo uno pega `/auth/refresh` y los
     * otros 4 esperan su resultado. Sin eso, 5 refreshes simultáneos rotan el
     * token cinco veces y cuatro de ellos revocan tokens que todavía se están
     * usando.
     */
    async _tryRefresh() {
        if (this.refreshing) {
            return new Promise((resolve) => {
                this.queue.push(resolve);
            });
        }

        this.refreshing = true;
        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh`, {
                method: 'POST',
                credentials: 'include'
            });
            const ok = response.ok;
            this.refreshing = false;
            this.queue.forEach((resolver) => resolver(ok));
            this.queue = [];
            return ok;
        } catch {
            this.refreshing = false;
            this.queue.forEach((resolver) => resolver(false));
            this.queue = [];
            return false;
        }
    }

    /**
     * La sesión ya no existe del lado del servidor, así que lo único que queda
     * por limpiar es el perfil cacheado. El token no está acá para borrarlo:
     * las cookies las borra el `Clear-Cookie` del backend, y si eso falló el
     * refresh ya va a seguir dando 401.
     *
     * Se borran también las claves viejas de la versión con tokens en
     * `localStorage`. No quedan activas porque nadie las lee, pero si un
     * navegador queda con una sesión a medio migrar, el token viejo sigue
     * viajando en el `Authorization` de un cliente viejo servido desde caché.
     */
    _clearSession() {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.TOKEN_REFRESH);
        localStorage.removeItem(STORAGE_KEYS.USER);
        window.location.hash = '#login';
        window.location.reload();
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    /**
     * `FormData` no puede pasar por `_config` con `Content-Type: application/json`
     * —el browser tiene que poner el `boundary` él solo, o el servidor no
     * encuentra el archivo. Por eso se llama a `fetch` directo y sin ese header.
     */
    upload(endpoint, formData) {
        const url = `${this.baseUrl}${endpoint}`;
        const enviar = () => fetch(url, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        return enviar().then(async (response) => {
            if (response.status === 401 && !SIN_REFRESH.some((ruta) => endpoint.startsWith(ruta))) {
                const renovado = await this._tryRefresh();
                if (renovado) {
                    const retry = await enviar();
                    if (!retry.ok) {
                        const body = await retry.json().catch(() => ({}));
                        throw this._buildError(body, retry.status);
                    }
                    return retry.json();
                }
                this._clearSession();
                return null;
            }
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw this._buildError(body, response.status);
            }
            return response.json();
        });
    }
}

// Se exporta la clase ademas del singleton: los tests necesitan una instancia
// propia por caso, porque el singleton arrastra entre llamadas el cerrojo de
// refresh y la cola de esperantes.
export { ApiClient };
export const api = new ApiClient();
export default api;
