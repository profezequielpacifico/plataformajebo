import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const teamService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/teams${queryString ? '?' + queryString : ''}`);
    },

    async getTodos(params = {}) {
        const primera = await this.getAll({ ...params, page: 1, limit: 100 });
        if (Array.isArray(primera)) return primera;
        const equipos = [...(primera.data || [])];
        const totalPaginas = primera.pagination?.totalPages || 1;
        for (let page = 2; page <= totalPaginas; page++) {
            const siguiente = await this.getAll({ ...params, page, limit: 100 });
            equipos.push(...(siguiente.data || []));
        }
        return equipos;
    },

    async getById(id) {
        return api.get(`/teams/${id}`);
    },

    async create(data) {
        return api.post('/teams', data);
    },

    async update(id, data) {
        return api.put(`/teams/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/teams/${id}`);
    },

    async enrollBatch(registrations) {
        return api.post('/teams/enroll-batch', { registrations });
    },

    async getEnrolled(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/teams/enrolled/list${queryString ? '?' + queryString : ''}`);
    }
};

export default teamService;
