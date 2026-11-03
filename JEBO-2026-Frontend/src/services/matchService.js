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

    /**
     * Estado completo de la pantalla en vivo, en una sola llamada.
     *
     * Antes la pantalla se armaba con varias peticiones encadenadas (partido,
     * marcador, arbitros) y cada una podia devolver un instante distinto: el
     * marcador de antes de un gol junto con el reloj de despues. `server_time`
     * viaja con la respuesta para que el cliente mida su propio desfase contra
     * el reloj de la base en lugar de suponer que el suyo es el correcto.
     */
    async getLive(id) {
        return api.get(`/matches/${id}/live`);
    },

    async getEvents(id, params = {}) {
        const queryString = buildQuery(params);
        return api.get(`/matches/${id}/events${queryString ? '?' + queryString : ''}`);
    },

    /**
     * Registra un evento del ledger.
     *
     * Solo van `id_equipo` e `idempotency_key`: el numero de evento, el tiempo
     * de partido y la hora real los calcula y los pone la base. La
     * `idempotency_key` la genera el cliente por click, y es lo que hace que un
     * doble toque o un reintento de red devuelvan el mismo evento en vez de
     * sumar dos.
     */
    async createEvent(id, data) {
        return api.post(`/matches/${id}/events`, data);
    },

    /**
     * Anula un evento. No lo borra: queda con estado ANULADO, motivo, autor y
     * fecha, y el marcador se recalcula solo por ser un conteo de los
     * confirmados.
     */
    async annulEvent(id, idEvento, data) {
        return api.patch(`/matches/${id}/events/${idEvento}/anular`, data);
    },

    /** accion es INICIAR | PAUSAR | REANUDAR. */
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
