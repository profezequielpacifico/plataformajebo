import api from '../api/index.js';

export const presentacionService = {
    async getAll(params = {}) {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && q.append(k, v));
        return api.get(`/presentaciones?${q.toString()}`);
    },

    async getById(id) {
        return api.get(`/presentaciones/${id}`);
    },

    async create(data) {
        return api.post('/presentaciones', data);
    },

    async update(id, data) {
        return api.put(`/presentaciones/${id}`, data);
    },

    async delete(id) {
        return api.delete(`/presentaciones/${id}`);
    },

    async updateEstado(id, estado) {
        return api.patch(`/presentaciones/${id}/estado`, { estado });
    },

    async getDetalleEvaluacion(id) {
        return api.get(`/presentaciones/${id}/detalle-evaluacion`);
    },

    async guardarEvaluacion(id, data) {
        return api.post(`/presentaciones/${id}/evaluaciones`, data);
    },

    async getEvaluacionesJuez(id, idJuez) {
        return api.get(`/presentaciones/${id}/evaluaciones`, { params: { id_juez: idJuez } });
    },

    async calcularResultado(id) {
        return api.post(`/presentaciones/${id}/calcular-resultado`);
    },

    async validarCierre(id) {
        return api.get(`/presentaciones/${id}/validar-cierre`);
    }
};

export default presentacionService;