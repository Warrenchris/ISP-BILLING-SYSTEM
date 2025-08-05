import { useState, useCallback } from 'react';
import { 
  authApi, 
  dataPlansApi, 
  subscriptionsApi, 
  paymentsApi, 
  invoicesApi, 
  dataUsageApi,
  adminApi 
} from '../utils/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeRequest = useCallback(async (apiCall, options = {}) => {
    const { showLoading = true, showError = true } = options;
    
    try {
      if (showLoading) setLoading(true);
      setError(null);
      
      const response = await apiCall();
      return response;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      
      if (showError) {
        setError(errorMessage);
      }
      
      throw err;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Auth operations
  const auth = {
    login: useCallback((credentials) => 
      executeRequest(() => authApi.login(credentials)), [executeRequest]),
    
    register: useCallback((userData) => 
      executeRequest(() => authApi.register(userData)), [executeRequest]),
    
    getProfile: useCallback(() => 
      executeRequest(() => authApi.getProfile()), [executeRequest]),
    
    updateProfile: useCallback((userData) => 
      executeRequest(() => authApi.updateProfile(userData)), [executeRequest]),
    
    changePassword: useCallback((passwordData) => 
      executeRequest(() => authApi.changePassword(passwordData)), [executeRequest]),
  };

  // Data Plans operations
  const dataPlans = {
    getAll: useCallback((params) => 
      executeRequest(() => dataPlansApi.getAll(params)), [executeRequest]),
    
    getById: useCallback((id) => 
      executeRequest(() => dataPlansApi.getById(id)), [executeRequest]),
    
    create: useCallback((planData) => 
      executeRequest(() => dataPlansApi.create(planData)), [executeRequest]),
    
    update: useCallback((id, planData) => 
      executeRequest(() => dataPlansApi.update(id, planData)), [executeRequest]),
    
    delete: useCallback((id) => 
      executeRequest(() => dataPlansApi.delete(id)), [executeRequest]),
  };

  // Subscriptions operations
  const subscriptions = {
    getAll: useCallback((params) => 
      executeRequest(() => subscriptionsApi.getAll(params)), [executeRequest]),
    
    getById: useCallback((id) => 
      executeRequest(() => subscriptionsApi.getById(id)), [executeRequest]),
    
    getCurrent: useCallback(() => 
      executeRequest(() => subscriptionsApi.getCurrent()), [executeRequest]),
    
    create: useCallback((subscriptionData) => 
      executeRequest(() => subscriptionsApi.create(subscriptionData)), [executeRequest]),
    
    update: useCallback((id, subscriptionData) => 
      executeRequest(() => subscriptionsApi.update(id, subscriptionData)), [executeRequest]),
    
    cancel: useCallback((id, reason) => 
      executeRequest(() => subscriptionsApi.cancel(id, reason)), [executeRequest]),
  };

  // Payments operations
  const payments = {
    getAll: useCallback((params) => 
      executeRequest(() => paymentsApi.getAll(params)), [executeRequest]),
    
    getById: useCallback((id) => 
      executeRequest(() => paymentsApi.getById(id)), [executeRequest]),
    
    initiateMpesa: useCallback((paymentData) => 
      executeRequest(() => paymentsApi.initiateMpesa(paymentData)), [executeRequest]),
    
    checkStatus: useCallback((transactionId) => 
      executeRequest(() => paymentsApi.checkStatus(transactionId)), [executeRequest]),
  };

  // Invoices operations
  const invoices = {
    getAll: useCallback((params) => 
      executeRequest(() => invoicesApi.getAll(params)), [executeRequest]),
    
    getById: useCallback((id) => 
      executeRequest(() => invoicesApi.getById(id)), [executeRequest]),
    
    downloadPdf: useCallback((id) => 
      executeRequest(() => invoicesApi.downloadPdf(id)), [executeRequest]),
    
    pay: useCallback((id, paymentData) => 
      executeRequest(() => invoicesApi.pay(id, paymentData)), [executeRequest]),
  };

  // Data Usage operations
  const dataUsage = {
    getCurrent: useCallback(() => 
      executeRequest(() => dataUsageApi.getCurrent()), [executeRequest]),
    
    getHistory: useCallback((params) => 
      executeRequest(() => dataUsageApi.getHistory(params)), [executeRequest]),
    
    getAnalytics: useCallback((params) => 
      executeRequest(() => dataUsageApi.getAnalytics(params)), [executeRequest]),
    
    startSession: useCallback((sessionData) => 
      executeRequest(() => dataUsageApi.startSession(sessionData)), [executeRequest]),
    
    updateSession: useCallback((sessionId, sessionData) => 
      executeRequest(() => dataUsageApi.updateSession(sessionId, sessionData)), [executeRequest]),
    
    endSession: useCallback((sessionId) => 
      executeRequest(() => dataUsageApi.endSession(sessionId)), [executeRequest]),
    
    getActiveSessions: useCallback(() => 
      executeRequest(() => dataUsageApi.getActiveSessions()), [executeRequest]),
  };

  // Admin operations
  const admin = {
    users: {
      getAll: useCallback((params) => 
        executeRequest(() => adminApi.users.getAll(params)), [executeRequest]),
      
      getById: useCallback((id) => 
        executeRequest(() => adminApi.users.getById(id)), [executeRequest]),
      
      update: useCallback((id, userData) => 
        executeRequest(() => adminApi.users.update(id, userData)), [executeRequest]),
      
      delete: useCallback((id) => 
        executeRequest(() => adminApi.users.delete(id)), [executeRequest]),
    },
    
    stats: {
      getDashboard: useCallback(() => 
        executeRequest(() => adminApi.stats.getDashboard()), [executeRequest]),
      
      getRevenue: useCallback((params) => 
        executeRequest(() => adminApi.stats.getRevenue(params)), [executeRequest]),
      
      getUsage: useCallback((params) => 
        executeRequest(() => adminApi.stats.getUsage(params)), [executeRequest]),
    },
    
    system: {
      getHealth: useCallback(() => 
        executeRequest(() => adminApi.system.getHealth()), [executeRequest]),
      
      getLogs: useCallback((params) => 
        executeRequest(() => adminApi.system.getLogs(params)), [executeRequest]),
    },
  };

  return {
    loading,
    error,
    clearError: () => setError(null),
    auth,
    dataPlans,
    subscriptions,
    payments,
    invoices,
    dataUsage,
    admin,
  };
};

export default useApi;

