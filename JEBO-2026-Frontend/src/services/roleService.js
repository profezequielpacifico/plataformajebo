import api from '../api/index.js';

export const roleService = {
    async getAll() {
        const response = await api.get('/roles');
        return response.data || response;
    }
};

export default roleService;
