import api from './api';

export const reportService = {
    getRevenueStats: (params) => api.get('/reports/revenue', { params }),
    getSubscriberGrowth: (params) => api.get('/reports/growth', { params }),
    getChurnRate: (params) => api.get('/reports/churn', { params }),
    getARPU: (params) => api.get('/reports/arpu', { params }),

    // Exporting
    exportReport: (type, params) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }) };
