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

  const fetchDashboardSummary = useCallback(async () => {
    setIsLoadingDashboard(true);
    clearError('dashboard');
    try {
      const response = await aiService.getDashboardSummary();
      const payload = response.data?.data || response.data || null;
      setDashboardSummary(payload);
      return payload;
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        dashboard: error.response?.data?.message || error.message || 'Failed to load AI dashboard summary',
      }));
      return null;
    } finally {
      setIsLoadingDashboard(false);
    }
  }, [clearError]);

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
    setIsLoadingAnomalies(true);
    clearError('anomalies');
    try {
      const response = await aiService.getAnomalies();
      const payload = response.data?.data || {};
      const list = payload.anomalies || [];
      setAnomalies(Array.isArray(list) ? list : []);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        anomalies: error.response?.data?.message || error.message || 'Failed to load anomalies',
      }));
      return [];
    } finally {
      setIsLoadingAnomalies(false);
    }
  }, [clearError]);

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
        fetchDashboardSummary,
        fetchChurnRisks,
        fetchAnomalies,
        clearError,
      }}
    >
      {children}
    </AiContext.Provider>
  );
};
