import { STORAGE_KEYS } from '../config/constants.js';
import ENV from '../config/env.js';

const SIN_REFRESH = ['/auth/login', '/auth/refresh', '/auth/logout', '/auth/recover-password', '/auth/register'];

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
        const configured = ENV.API.BASE_URL;
        if (configured && /^https?:\/\//i.test(configured)) {
            return configured.replace(/\/$/, '');
        }
        return '/api';
    }

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

export { ApiClient };
export const api = new ApiClient();
export default api;
