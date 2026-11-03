import api from '../api/index.js';
import { STORAGE_KEYS } from '../config/constants.js';

/**
 * El perfil cacheado es una AYUDA de render, no una credencial.
 *
 * Se guarda en `localStorage` porque hace falta para pintar antes de que llegue
 * el primer `/auth/me`. Lo que NO se guarda es el token: los dos viajan en
 * cookies `httpOnly`, que JavaScript no puede leer. Esa es toda la diferencia
 * con la versión anterior — antes `localStorage.getItem('token')` le entregaba
 * el access token a cualquier script que corriera en la página, y un XSS solo
 * tenía que pedirlo.
 *
 * La consecuencia práctica es que `isAuthenticated()` ya no es una prueba de
 * nada: un perfil cacheado puede sobrevivir a una sesión que el servidor ya
 * cerró. Por eso devuelve `true` solo para pintar la pantalla, y la primera
 * llamada autenticada es la que decide de verdad (y si da 401, `api` limpia la
 * sesión y manda a `/login`).
 */export const authService = {
    async login(credentials) {
        const response = await api.post('/auth/login', credentials);
        const { user } = response.data || response;
        if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        }
        return response;
    },

    async logout() {
        try {
            // El backend borra las cookies con `Clear-Cookie`; acá se limpia lo
            // único que queda en el cliente, el perfil cacheado. Va en `finally`
            // para que también se limpie si la red falla: si el POST no llega y
            // el perfil sobrevive, la app sigue mostrando la sesión como activa
            // aunque el servidor ya la haya cerrado.
        } finally {
            localStorage.removeItem(STORAGE_KEYS.USER);
            // Claves de la versión con tokens: se borran por si quedó una
            // sesión a medio migrar en este navegador.
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.TOKEN_REFRESH);
        }
    },

    async getCurrentUser() {
        const response = await api.get('/auth/me');
        return response.data || response;
    },

    async getLoginStatus() {
        const response = await api.get('/auth/loginStatus');
        return response.data || response;
    },

    async register(data) {
        return api.post('/auth/register', data);
    },

    async recoverPassword(email) {
        return api.post('/auth/recover-password', { email });
    },

    /**
     * Si hay sesión, `api` la renueva sola contra `/auth/refresh` en el primer
     * 401. Este método queda solo para quien quiera forzar la renovación antes
     * de time out, y devuelve un booleano porque con cookies no hay token que
     * devolver.
     */
    async refresh() {
        const response = await api.post('/auth/refresh');
        return !!(response && (response.data || response).user);
    },

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.USER);
    },

    getUser() {
        try {
            const stored = localStorage.getItem(STORAGE_KEYS.USER);
            return stored ? JSON.parse(stored) : null;
        } catch {
            // Un perfil corrupto (escritura a medias, extensión del navegador,
            //storage lleno) no puede dejar la app sin arrancar.
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }
    }
};

export default authService;
