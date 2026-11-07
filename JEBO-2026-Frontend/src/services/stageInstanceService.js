import api from '../api/index.js';

const datos = (respuesta) => respuesta?.data ?? respuesta;

export const stageInstanceService = {
    async getPorTorneo(idTorneo) {
        return datos(await api.get(`/stage-instances/torneo/${idTorneo}`));
    },

    async getDetalle(id) {
        return datos(await api.get(`/stage-instances/${id}`));
    },

    async prepararEtapa(idEtapa) {
        return datos(await api.post(`/stage-instances/etapa/${idEtapa}/preparar`));
    },

    async generarEncuentros(id) {
        return datos(await api.post(`/stage-instances/${id}/encuentros`));
    },

    async finalizar(id, desempate) {
        return datos(await api.post(`/stage-instances/${id}/finalizar`, desempate ? { desempate } : {}));
    }
};

export default stageInstanceService;
