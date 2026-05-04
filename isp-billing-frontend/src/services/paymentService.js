import api from '../utils/api';

export const paymentService = {
    // Admin
    getAllPayments: (params) => api.get('/payments', { params }),
    createCashPayment: (data) => api.post('/payments/cash', data),
    recordCashPayment: (data) => api.post('/payments/record-cash', data),
    confirmPayment: (id) => api.put(`/payments/${id}/confirm`),
    rejectPayment: (id) => api.put(`/payments/${id}/reject`),

    // User & Shared
    getMyPayments: (params) => api.get('/payments/history', { params }),
    getById: (id) => api.get(`/payments/${id}`),
    queryStatus: (id) => api.get(`/payments/status/${id}`),
    checkStatus: (id) => api.get(`/payments/status/${id}`),
    initiateSubscriptionPayment: (dataOrSubscriptionId, maybePhoneNumber) => {
        const payload = typeof dataOrSubscriptionId === 'object'
            ? dataOrSubscriptionId
            : { subscriptionId: dataOrSubscriptionId, phoneNumber: maybePhoneNumber };
        return api.post('/payments/subscription', payload);
    },

    // M-Pesa
    initiateMpesa: (data) => api.post('/payments/mpesa/initiate', data),
    retryPayment: (id, data) => api.post(`/payments/${id}/retry`, data),

    // Invoices
    getAllInvoices: (params) => api.get('/invoices', { params }),
    getMyInvoices: (params) => api.get('/invoices/my', { params }),
    getInvoiceById: (id) => api.get(`/invoices/${id}`),
    downloadInvoicePdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
    markInvoicePaid: (id, data) => api.put(`/invoices/${id}/mark-paid`, data),

    // Stats
    getStats: () => api.get('/payments/stats') };
