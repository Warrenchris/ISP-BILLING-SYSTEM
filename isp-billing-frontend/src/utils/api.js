import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json' } });

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData) };

// Data Plans API
export const dataPlansApi = {
  getAll: (params = {}) => api.get('/plans', { params }),
  getById: (id) => api.get(`/plans/${id}`),
  create: (planData) => api.post('/plans', planData),
  update: (id, planData) => api.put(`/plans/${id}`, planData),
  delete: (id) => api.delete(`/plans/${id}`) };

// Subscriptions API
export const subscriptionsApi = {
  getAll: (params = {}) => api.get('/subscriptions', { params }),
  getById: (id) => api.get(`/subscriptions/${id}`),
  getCurrent: () => api.get('/subscriptions/current'),
  create: (subscriptionData) => api.post('/subscriptions', subscriptionData),
  update: (id, subscriptionData) => api.put(`/subscriptions/${id}`, subscriptionData),
  cancel: (id, reason) => api.put(`/subscriptions/${id}/cancel`, { reason }) };

// Payments API
export const paymentsApi = {
  getAll: (params = {}) => api.get('/payments', { params }),
  getById: (id) => api.get(`/payments/${id}`),
  initiateMpesa: (paymentData) => api.post('/payments/mpesa/initiate', paymentData),
  initiateSubscriptionPayment: (paymentData) => api.post('/payments/subscription', paymentData),
  checkStatus: (transactionId) => api.get(`/payments/status/${transactionId}`) };

// Invoices API
export const invoicesApi = {
  getAll: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  pay: (id, paymentData) => api.post(`/invoices/${id}/pay`, paymentData) };

// Data Usage API
export const dataUsageApi = {
  getCurrent: () => api.get('/usage/current'),
  getHistory: (params = {}) => api.get('/usage/history', { params }),
  getAnalytics: (params = {}) => api.get('/usage/analytics', { params }),
  startSession: (sessionData) => api.post('/usage/sessions', sessionData),
  updateSession: (sessionId, sessionData) => api.put(`/usage/sessions/${sessionId}`, sessionData),
  endSession: (sessionId) => api.post(`/usage/sessions/${sessionId}/end`),
  getActiveSessions: () => api.get('/usage/sessions/active') };

// Admin APIs (for admin users)
export const adminApi = {
  // Users management
  users: {
    getAll: (params = {}) => api.get('/admin/users', { params }),
    getById: (id) => api.get(`/admin/users/${id}`),
    update: (id, userData) => api.put(`/admin/users/${id}`, userData),
    delete: (id) => api.delete(`/admin/users/${id}`) },

  // System statistics
  stats: {
    getDashboard: () => api.get('/admin/stats/dashboard'),
    getRevenue: (params = {}) => api.get('/admin/stats/revenue', { params }),
    getUsage: (params = {}) => api.get('/admin/stats/usage', { params }) },

  // System management
  system: {
    getHealth: () => api.get('/health'),
    getLogs: (params = {}) => api.get('/admin/logs', { params }) } };

export default api;

