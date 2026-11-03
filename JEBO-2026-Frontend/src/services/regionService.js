import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const regionService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/regions${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/regions/${id}`);
    },

    async create(data) {
        return api.post('/regions', data);
    },

    async update(id, data) {
        return api.put(`/regions/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/regions/${id}`);
    }
};

export default regionService;
