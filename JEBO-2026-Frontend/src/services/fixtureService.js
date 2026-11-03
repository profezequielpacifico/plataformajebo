import api from '../api/index.js';

export const fixtureService = {
    async getStatus(idTorneo) {
        return api.get(`/fixture/status/${idTorneo}`);
    },

    async generate(idTorneo) {
        return api.post('/fixture/generate', { id_torneo: idTorneo });
    }
};

export default fixtureService;