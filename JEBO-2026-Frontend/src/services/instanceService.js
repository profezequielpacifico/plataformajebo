import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const instanceService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/instancias${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/instancias/${id}`);
    },

    async create(data) {
        return api.post('/instancias', data);
    },

    async update(id, data) {
        return api.put(`/instancias/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/instancias/${id}`);
    }
};

export default instanceService;
