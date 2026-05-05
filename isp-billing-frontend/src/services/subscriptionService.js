import api from '../utils/api';

export const subscriptionService = {
    // Subscriptions
    getAll: (params) => api.get('/subscriptions', { params }),
    /** Admin or support — all tenant subscriptions */
    getAllAdmin: (params) => api.get('/subscriptions/all', { params }),
    getById: (id) => api.get(`/subscriptions/${id}`),
    getCurrent: () => api.get('/subscriptions/current'),
    create: (data) => api.post('/subscriptions', data),
    update: (id, data) => api.put(`/subscriptions/${id}`, data),
    cancel: (id, reason) => api.put(`/subscriptions/${id}/cancel`, { reason }),
    // Admin subscription actions (mounted under /api/subscriptions/* on backend)
    changePlan: (subscriptionId, data) =>
        api.patch(`/subscriptions/admin/subscriptions/${subscriptionId}/plan`, data),
    extend: (subscriptionId, data) =>
        api.patch(`/subscriptions/admin/subscriptions/${subscriptionId}/extend`, data),

    // Data Plans
    getPlans: (params) => api.get('/plans', { params }),
    getPlanById: (id) => api.get(`/plans/${id}`),
    createPlan: (data) => api.post('/plans', data),
    updatePlan: (id, data) => api.put(`/plans/${id}`, data),
    deletePlan: (id) => api.delete(`/plans/${id}`) };
