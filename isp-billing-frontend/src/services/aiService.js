import api from '../utils/api';

const aiService = {
  getHealth: () =>
    api.get('/ai/health'),

  predictRevenue: (payload) =>
    api.post('/ai/predict-revenue', payload),

  getChurnRisks: () =>
    api.get('/ai/churn-risks'),

  getAnomalies: () =>
    api.get('/ai/anomalies'),

  chat: (customerId, message, sessionId) =>
    api.post('/ai/chat', { customerId, message, sessionId }),

  getDashboardSummary: () =>
    api.get('/ai/dashboard-summary'),

  retrain: () =>
    api.post('/ai/retrain'),

  getChatSessions: () =>
    api.get('/ai/chat/sessions'),
};

export default aiService;
