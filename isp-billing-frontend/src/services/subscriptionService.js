import api from './api';

export const subscriptionService = {
    // Subscriptions
    getAll: (params) => api.get('/subscriptions', { params }),
    getById: (id) => api.get(`/subscriptions/${id}`),
    getCurrent: () => api.get('/subscriptions/current'),
    create: (data) => api.post('/subscriptions', data),
    update: (id, data) => api.put(`/subscriptions/${id}`, data),
    cancel: (id, reason) => api.put(`/subscriptions/${id}/cancel`, { reason }),

    // Data Plans
    getPlans: (params) => api.get('/plans', { params }),
    getPlanById: (id) => api.get(`/plans/${id}`),
    createPlan: (data) => api.post('/plans', data),
    updatePlan: (id, data) => api.put(`/plans/${id}`, data),
    deletePlan: (id) => api.delete(`/plans/${id}`) };
