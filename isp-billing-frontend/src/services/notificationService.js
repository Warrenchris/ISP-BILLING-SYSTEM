import api from '../utils/api';

export const notificationService = {
    getAll: (params) => api.get('/notifications/all', { params }), // System logs
    getMyNotifications: (params) => api.get('/notifications', { params }), // User
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    delete: (id) => api.delete(`/notifications/${id}`) };
