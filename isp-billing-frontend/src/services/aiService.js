import api from '../utils/api';

const aiService = {
  getHealth: () =>
    api.get('/ai/health'),

  predictRevenue: (payload) =>
    api.post('/ai/predict-revenue', payload),

  chat: (customerId, message, sessionId) =>
    api.post('/ai/chat', { customerId, message, sessionId }),

  getDashboardSummary: () =>
    api.get('/ai/dashboard-summary', { timeout: 8000 }),

  retrain: () =>
    api.post('/ai/retrain'),

  /** Flush the Python AI service's in-memory cache. Admin-only. */
  clearCache: () =>
    api.post('/ai/cache/clear'),

  getChatSessions: () =>
    api.get('/ai/chat/sessions'),
};

export default aiService;
