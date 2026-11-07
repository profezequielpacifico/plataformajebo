import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const competenciaService = {
    async getAll(page = 1, limit = 10, params = {}) {
        const queryParams = buildQuery({ page, limit, ...params });
        const response = await api.get(`/competencias?${queryParams}`);
        return response.data || response;
    },

    async getById(id) {
        const response = await api.get(`/competencias/${id}`);
        return response.data || response;
    },

    async getEtapas(id) {
        const response = await api.get(`/competencias/${id}/etapas`);
        return response.data || response;
    },

    async create(data) {
        const response = await api.post('/competencias', data);
        return response.data || response;
    },

    async update(id, data) {
        const response = await api.put(`/competencias/${id}`, data);
        return response.data || response;
    },

    async delete(id) {
        const response = await api.delete(`/competencias/${id}`);
        return response.data || response;
    },

    async evaluarEtapa(etapaId) {
        const response = await api.post(`/competencias/${etapaId}/evaluar`);
        return response.data || response;
    },

    async getParticipantes(etapaId) {
        const response = await api.get(`/competencias/${etapaId}/participantes`);
        return response.data || response;
    },

    async generarParticipantes(etapaId, participantes) {
        const response = await api.post(`/competencias/${etapaId}/generar-participantes`, { participantes });
        return response.data || response;
    },
};

export default competenciaService;
