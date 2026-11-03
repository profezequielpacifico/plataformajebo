import api from '../api/index.js';

export const userService = {
    async getAll(params = {}) {
        const query = new URLSearchParams();
        if (params.rol) query.set('rol', params.rol);
        if (params.search) query.set('search', params.search);
        const qs = query.toString();
        return api.get(`/users${qs ? '?' + qs : ''}`);
    },

    async getById(id) {
        return api.get(`/users/${id}`);
    },

    async create(data) {
        return api.post('/users', data);
    },

    async update(id, data) {
        return api.put(`/users/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/users/${id}`);
    }
};

export default userService;
