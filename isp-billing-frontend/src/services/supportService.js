import api from './api';

export const supportService = {
    getAll: (params) => api.get('/support/tickets', { params }), // Admin view
    getMyTickets: (params) => api.get('/support/my-tickets', { params }), // User view
    getById: (id) => api.get(`/support/tickets/${id}`),
    create: (data) => api.post('/support/tickets', data),
    update: (id, data) => api.put(`/support/tickets/${id}`, data),

    // Messages within ticket
    addMessage: (id, message) => api.post(`/support/tickets/${id}/messages`, { message }),

    // Status updates
    close: (id) => api.put(`/support/tickets/${id}/close`),
    assign: (id, staffId) => api.put(`/support/tickets/${id}/assign`, { staffId }),
};
