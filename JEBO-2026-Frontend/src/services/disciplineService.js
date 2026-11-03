import api from '../api/index.js';
import { buildQuery } from './buildQuery.js';

export const disciplineService = {
    async getAll(params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/disciplines${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return api.get(`/disciplines/${id}`);
    },

    async create(data) {
        return api.post('/disciplines', data);
    },

    async update(id, data) {
        return api.put(`/disciplines/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/disciplines/${id}`);
    },

    async uploadReglamento(id, file) {
        const formData = new FormData();
        formData.append('reglamento', file);
        return api.upload(`/disciplines/${id}/reglamento`, formData);
    },

    getReglamentoUrl(reglamento) {
        if (!reglamento) return '';
        if (/^https?:\/\//i.test(reglamento)) return reglamento;
        return `${api.baseUrl}${reglamento}`;
    }
};

export default disciplineService;
