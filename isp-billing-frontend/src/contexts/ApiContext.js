import React, { createContext, useContext } from "react";
import api from "../services/api";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { subscriptionService } from "../services/subscriptionService";
import { paymentService } from "../services/paymentService";
import { supportService } from "../services/supportService";
import { reportService } from "../services/reportService";
import { auditService } from "../services/auditService";
import { notificationService } from "../services/notificationService";
import { settingService } from "../services/settingService";

const ApiContext = createContext();

export const useApi = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within an ApiProvider");
  return ctx;
};

export const ApiProvider = ({ children }) => {
  // Mapping services to the context value to match existing usage where possible,
  // and exposing new services.

  // existing mappings (for backward compatibility where names differ)
  const authApi = authService;
  const dataPlansApi = {
    getAll: subscriptionService.getPlans,
    getById: subscriptionService.getPlanById,
    create: subscriptionService.createPlan,
    update: subscriptionService.updatePlan,
    delete: subscriptionService.deletePlan
  };
  const subscriptionsApi = subscriptionService;
  const paymentsApi = paymentService;

  const invoicesApi = {
    getAll: paymentService.getAllInvoices,
    getMy: paymentService.getMyInvoices,
    getById: paymentService.getInvoiceById,
    downloadPdf: paymentService.downloadInvoicePdf,
    markAsPaid: paymentService.markInvoicePaid
  };

  // Admin API abstraction to match previous structure
  const adminApi = {
    users: userService,
    settings: settingService,
    audit: auditService,
    notifications: notificationService
  };

  // Data Usage (Keeping this one inline or assuming it will be refactored later if needed, 
  // but for now we can create a simple object proxying to api directly if no service exists, 
  // or add a usageService. Let's create a minimal proxy here to avoid breaking existing code).
  const dataUsageApi = {
    getCurrent: () => api.get("/usage/current"),
    getHistory: p => api.get("/usage/history", { params: p }),
    getAnalytics: p => api.get("/usage/analytics", { params: p }),
    startSession: d => api.post("/usage/sessions", d),
    updateSession: (sid, d) => api.put(`/usage/sessions/${sid}`, d),
    endSession: sid => api.post(`/usage/sessions/${sid}/end`)
  };

  return (
    <ApiContext.Provider
      value={{
        api, // Direct access if needed
        authApi,
        dataPlansApi,
        subscriptionsApi,
        paymentsApi,
        invoicesApi,
        dataUsageApi,
        adminApi,
        // Expose new services directly for new pages
        supportService,
        reportService,
        auditService,
        notificationService,
        settingService
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};