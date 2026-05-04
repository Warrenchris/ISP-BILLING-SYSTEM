import api from '../utils/api';

export const reportService = {
    getSummary: (params) => api.get('/reports/summary', { params }),
    getRevenueChart: (params) => api.get('/reports/revenue-chart', { params }),
    getUserGrowthChart: (params) => api.get('/reports/user-growth-chart', { params }),
    getRevenueStats: (params) => api.get('/reports/revenue', { params }),
    getSubscriberGrowth: (params) => api.get('/reports/growth', { params }),
    getChurnRate: (params) => api.get('/reports/churn', { params }),
    getARPU: (params) => api.get('/reports/arpu', { params }),

    // Exporting
    exportReport: (type, params) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }) };
