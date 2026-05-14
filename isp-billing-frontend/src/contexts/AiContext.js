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
      
      if (payload) {
        setDashboardSummary(payload);
        
        // Bundled Churn
        if (payload.churn?.top5AtRisk) {
          setChurnRisks(payload.churn.top5AtRisk);
        }
        
        // Bundled Anomalies
        if (payload.anomalies?.list) {
          setAnomalies(payload.anomalies.list);
        }
      }
      
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

  return (
    <AiContext.Provider
      value={{
        dashboardSummary,
        churnRisks,
        anomalies,
        isLoadingDashboard,
        isLoadingChurn: false,
        isLoadingAnomalies: false,
        errors,
        aiUnavailable,
        aiFailureCount,
        fetchDashboardSummary,
        resetAiFailureLock,
        clearError,
      }}
    >
      {children}
    </AiContext.Provider>
  );
};
