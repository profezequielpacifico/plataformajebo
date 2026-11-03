import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const tournamentService = {
    async getAll(page = 1, limit = 10, params = {}) {
        const queryParams = buildQuery({ page, limit, ...params });
        const response = await api.get(`/tournaments?${queryParams}`);
        return response.data || response;
    },

    async getById(id) {
        const response = await api.get(`/tournaments/${id}`);
        return response.data || response;
    },

    async create(data) {
        const response = await api.post('/tournaments', data);
        return response.data || response;
    },

    async update(id, data) {
        const response = await api.put(`/tournaments/${id}`, data);
        return response.data || response;
    },

    async delete(id) {
        const response = await api.delete(`/tournaments/${id}`);
        return response.data || response;
    },

    async getStandings(tournamentId) {
        const response = await api.get(`/tournaments/${tournamentId}/standings`);
        return response.data || response;
    },

    async getQualified(tournamentId) {
        const response = await api.get(`/tournaments/${tournamentId}/qualified`);
        return response.data || response;
    },

    async getFinal(tournamentId) {
        const response = await api.get(`/tournaments/${tournamentId}/final`);
        return response.data || response;
    }
};

export default tournamentService;
