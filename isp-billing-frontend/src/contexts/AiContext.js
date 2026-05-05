import React, { createContext, useCallback, useContext, useState } from 'react';
import aiService from '../services/aiService';

const AiContext = createContext();

export const useAi = () => {
  const context = useContext(AiContext);
  if (!context) {
    throw new Error('useAi must be used within an AiProvider');
  }
  return context;
};

export const AiProvider = ({ children }) => {
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [churnRisks, setChurnRisks] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiFailureCount, setAiFailureCount] = useState(0);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isLoadingChurn, setIsLoadingChurn] = useState(false);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = useCallback((key) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const registerAiSuccess = useCallback(() => {
    setAiFailureCount(0);
    setAiUnavailable(false);
  }, []);

  const registerAiFailure = useCallback(() => {
    setAiFailureCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setAiUnavailable(true);
      }
      return next;
    });
  }, []);

  const resetAiFailureLock = useCallback(() => {
    setAiFailureCount(0);
    setAiUnavailable(false);
    clearError('dashboard');
    clearError('anomalies');
  }, [clearError]);

  const fetchDashboardSummary = useCallback(async () => {
    if (aiUnavailable) {
      setErrors((prev) => ({
        ...prev,
        dashboard: 'AI service temporarily unavailable',
      }));
      return null;
    }
    setIsLoadingDashboard(true);
    clearError('dashboard');
    try {
      const response = await aiService.getDashboardSummary();
      const payload = response.data?.data || response.data || null;
      setDashboardSummary(payload);
      registerAiSuccess();
      return payload;
    } catch (error) {
      registerAiFailure();
      setErrors((prev) => ({
        ...prev,
        dashboard: 'AI service temporarily unavailable',
      }));
      return null;
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [aiUnavailable, clearError, registerAiFailure, registerAiSuccess]);

  const fetchChurnRisks = useCallback(async () => {
    setIsLoadingChurn(true);
    clearError('churn');
    try {
      const response = await aiService.getChurnRisks();
      const payload = response.data?.data || {};
      const list = payload.atRiskCustomers || [];
      setChurnRisks(Array.isArray(list) ? list : []);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        churn: error.response?.data?.message || error.message || 'Failed to load churn risks',
      }));
      return [];
    } finally {
      setIsLoadingChurn(false);
    }
  }, [clearError]);

  const fetchAnomalies = useCallback(async () => {
    if (aiUnavailable) {
      setErrors((prev) => ({
        ...prev,
        anomalies: 'AI service temporarily unavailable',
      }));
      return [];
    }
    setIsLoadingAnomalies(true);
    clearError('anomalies');
    try {
      const response = await aiService.getAnomalies();
      const payload = response.data?.data || {};
      const list = payload.anomalies || [];
      setAnomalies(Array.isArray(list) ? list : []);
      registerAiSuccess();
      return Array.isArray(list) ? list : [];
    } catch (error) {
      registerAiFailure();
      setErrors((prev) => ({
        ...prev,
        anomalies: 'AI service temporarily unavailable',
      }));
      return [];
    } finally {
      setIsLoadingAnomalies(false);
    }
  }, [aiUnavailable, clearError, registerAiFailure, registerAiSuccess]);

  return (
    <AiContext.Provider
      value={{
        dashboardSummary,
        churnRisks,
        anomalies,
        isLoadingDashboard,
        isLoadingChurn,
        isLoadingAnomalies,
        errors,
        aiUnavailable,
        aiFailureCount,
        fetchDashboardSummary,
        fetchChurnRisks,
        fetchAnomalies,
        resetAiFailureLock,
        clearError,
      }}
    >
      {children}
    </AiContext.Provider>
  );
};
