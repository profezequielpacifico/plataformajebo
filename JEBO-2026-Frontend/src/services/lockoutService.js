import api from '../api/index.js';

export const lockoutService = {
    async getAll() {
        return api.get('/admin/login-lockouts');
    },

    async unlock(ip) {
        return api.delete(`/admin/login-lockouts/${encodeURIComponent(ip)}`);
    }
};

export default lockoutService;