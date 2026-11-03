import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const districtService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/districts${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/districts/${id}`);
    },

    async create(data) {
        return api.post('/districts', data);
    },

    async update(id, data) {
        return api.put(`/districts/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/districts/${id}`);
    }
};

export default districtService;
