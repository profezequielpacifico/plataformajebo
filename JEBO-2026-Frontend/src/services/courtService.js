import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const courtService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/courts${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/courts/${id}`);
    },

    async create(data) {
        return api.post('/courts', data);
    },

    async update(id, data) {
        return api.put(`/courts/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/courts/${id}`);
    },

    async getAvailability(canchaId, fecha) {
        return api.get(`/courts/${canchaId}/disponibilidad?fecha=${fecha}`);
    },

    async getHorarios() {
        return api.get('/courts/horarios');
    },

    async getSchedule(canchaId) {
        return api.get(`/courts/${canchaId}/schedule`);
    },

    async updateSchedule(canchaId, items) {
        return api.put(`/courts/${canchaId}/schedule`, { items });
    }
};

export default courtService;
