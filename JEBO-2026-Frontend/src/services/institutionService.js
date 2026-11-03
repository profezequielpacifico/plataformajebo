import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const institutionService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/institutions${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/institutions/${id}`);
    },

    async create(data) {
        return api.post('/institutions', data);
    },

    async update(id, data) {
        return api.put(`/institutions/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/institutions/${id}`);
    }
};

export default institutionService;
