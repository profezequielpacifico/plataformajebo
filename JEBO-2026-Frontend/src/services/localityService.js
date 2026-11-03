import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const localityService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/localities${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/localities/${id}`);
    },

    async create(data) {
        return api.post('/localities', data);
    },

    async update(id, data) {
        return api.put(`/localities/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/localities/${id}`);
    }
};

export default localityService;
