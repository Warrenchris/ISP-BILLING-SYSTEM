import api from '../utils/api';

export const auditService = {
    getAll: (params) => api.get('/admin/audit-logs', { params }),
    getById: (id) => api.get(`/admin/audit-logs/${id}`) };
