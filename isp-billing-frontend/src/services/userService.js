import api from './api';

export const userService = {
    // General User Management
    getAll: (params) => api.get('/admin/users', { params }),
    getById: (id) => api.get(`/admin/users/${id}`),
    create: (data) => api.post('/admin/users', data),
    update: (id, data) => api.put(`/admin/users/${id}`, data),
    delete: (id) => api.delete(`/admin/users/${id}`),

    // Specific Actions
    suspend: (id) => api.put(`/admin/users/${id}/suspend`),
    activate: (id) => api.put(`/admin/users/${id}/activate`),

    // Subscription related to user
    getUserSubscription: (userId) => api.get(`/admin/users/${userId}/subscription`),

    // Staff & Roles (Assuming separate endpoints or filtered users)
    getStaff: () => api.get('/admin/users', { params: { role: 'staff' } }), // Adjust based on backend API

    // Dashboard / Stats
    getStats: () => api.get('/admin/stats/users'),
};
