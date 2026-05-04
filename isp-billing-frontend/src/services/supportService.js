import api from '../utils/api';

// Base path matches app.js: /api/support/tickets
const BASE = '/support/tickets';

export const supportService = {
    // ─── Ticket CRUD ─────────────────────────────────────────────────────────
    /**
     * Fetch all tickets (admin/support) or own tickets (customer).
     * Accepted params: { search, status, priority, category, assignedTo, page, limit }
     */
    getAll: (params) => api.get(BASE, { params }),

    getById: (id) => api.get(`${BASE}/${id}`),

    create: (data) => api.post(BASE, data),

    update: (id, data) => api.put(`${BASE}/${id}`, data),

    // ─── Ticket actions ───────────────────────────────────────────────────────
    close: (id) => api.put(`${BASE}/${id}/close`),

    assign: (id, staffId) => api.put(`${BASE}/${id}/assign`, { staffId }),

    delete: (id) => api.delete(`${BASE}/${id}`),

    // ─── Messages within a ticket ─────────────────────────────────────────────
    addMessage: (id, message) => api.post(`${BASE}/${id}/messages`, { message }),

    // ─── Metadata / config (for dropdowns & badge colours) ────────────────────
    getCategories:  () => api.get(`${BASE}/categories`),
    getPriorities:  () => api.get(`${BASE}/priorities`),
    getStatuses:    () => api.get(`${BASE}/statuses`),
    getLabelsConfig:() => api.get(`${BASE}/labels-config`),

    /** Staff list (admin + support users) for "Assign To" dropdowns */
    getStaff: () => api.get(`${BASE}/staff`) };
