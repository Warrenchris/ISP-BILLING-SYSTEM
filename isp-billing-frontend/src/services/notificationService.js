import api from './api';

export const notificationService = {
    getAll: (params) => api.get('/admin/notifications', { params }), // System logs
    getMyNotifications: (params) => api.get('/notifications', { params }), // User
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    delete: (id) => api.delete(`/notifications/${id}`),
};
