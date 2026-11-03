import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const teamService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/teams${queryString ? '?' + queryString : ''}`);
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
