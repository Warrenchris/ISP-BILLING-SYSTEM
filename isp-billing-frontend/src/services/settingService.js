import api from './api';

export const settingService = {
    getCompanyInfo: () => api.get('/admin/settings/company'),
    updateCompanyInfo: (data) => api.put('/admin/settings/company', data),

    getPaymentSettings: () => api.get('/admin/settings/payments'),
    updatePaymentSettings: (data) => api.put('/admin/settings/payments', data),
};
