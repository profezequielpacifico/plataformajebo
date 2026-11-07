import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const matchService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/matches${queryString ? '?' + queryString : ''}`);
    },

    async getMine(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/matches/mios${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/matches/${id}`);
    },

    async create(data) {
        return api.post('/matches', data);
    },

    async update(id, data) {
        return api.put(`/matches/${id}`, data);
    },

    async updateResult(id, data) {
        return api.patch(`/matches/${id}/result`, data);
    },

    async updateStatus(id, data) {
        return api.patch(`/matches/${id}/status`, data);
    },

    async getLive(id) {
        return api.get(`/matches/${id}/live`);
    },

    async getEvents(id, params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/matches/${id}/events${queryString ? '?' + queryString : ''}`);
    },

    async createEvent(id, data) {
        return api.post(`/matches/${id}/events`, data);
    },

    async annulEvent(id, idEvento, data) {
        return api.patch(`/matches/${id}/events/${idEvento}/anular`, data);
    },

    async clockAction(id, accion) {
        return api.post(`/matches/${id}/clock`, { accion });
    },

    async getClock(id) {
        return api.get(`/matches/${id}/clock`);
    },

    async delete(id) {
        return api.delete(`/matches/${id}`);
    }
};

export default matchService;
