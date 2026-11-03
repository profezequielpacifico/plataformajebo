import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const stageService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/stages${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/stages/${id}`);
    },

    async create(data) {
        return api.post('/stages', data);
    },

    async update(id, data) {
        return api.put(`/stages/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/stages/${id}`);
    }
};

export default stageService;
