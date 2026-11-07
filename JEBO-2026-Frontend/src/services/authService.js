import api from '../api/index.js';
import { STORAGE_KEYS } from '../config/constants.js';

export const authService = {
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
            await api.post('/auth/logout').catch(() => null);
        } finally {
            localStorage.removeItem(STORAGE_KEYS.USER);
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
            localStorage.removeItem(STORAGE_KEYS.USER);
            return null;
        }
    }
};

export default authService;
