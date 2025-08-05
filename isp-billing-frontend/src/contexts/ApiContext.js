import React, { createContext, useContext } from "react";
import axios from "axios";

const ApiContext = createContext();

export const useApi = () => {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within an ApiProvider");
  return ctx;
};

// ────────────────────────────────────────────────────────────
// axios instance
const createApi = () => {
  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:3000/api",
    timeout: 10_000,
    headers: { "Content-Type": "application/json" }
  });

  // Add auth token to requests
  api.interceptors.request.use(config => {
    // Add cache-buster
    config.params = { ...(config.params || {}), _t: Date.now() };
    
    // Add auth token if available - try multiple possible token keys
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  localStorage.getItem('accessToken') ||
                  localStorage.getItem('jwt');
    
    if (token) {
      // Try different header formats based on your auth middleware
      config.headers.Authorization = `Bearer ${token}`;
      // Alternatively, if your middleware expects a different format:
      // config.headers['x-auth-token'] = token;
      // config.headers.Authorization = token;
    }
    
    return config;
  });

  api.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  );

  return api;
};
// ────────────────────────────────────────────────────────────

export const ApiProvider = ({ children }) => {
  const api = createApi();

  const authApi = {
    login:          data => api.post("/auth/login", data),
    register:       data => api.post("/auth/register", data),
    profile:        ()   => api.get ("/auth/profile"),
    updateProfile:  d   => api.put ("/auth/profile", d),
    changePassword: d   => api.put ("/auth/change-password", d)
  };

  const dataPlansApi = {
    getAll:  p        => api.get ("/plans", { params: p }),
    getById: id       => api.get (`/plans/${id}`),
    create:  d        => api.post("/plans", d),
    update:  (id, d)  => api.put (`/plans/${id}`, d),
    delete:  id       => api.delete(`/plans/${id}`)
  };

  const subscriptionsApi = {
    getAll:   p            => api.get ("/subscriptions", { params: p }),
    getById:  id           => api.get (`/subscriptions/${id}`),
    getCurrent:            () => api.get ("/subscriptions/current"),
    create:   d            => api.post("/subscriptions", d),
    update:   (id, d)      => api.put (`/subscriptions/${id}`, d),
    cancel:   (id, reason) => api.put (`/subscriptions/${id}/cancel`, { reason })
  };

  const paymentsApi = {
    getAllPayments: p => api.get("/payments", { params: p }), // Admin: Get all payments
    getPaymentHistory: p => api.get("/payments/history", { params: p }), // User: Get payment history
    getById:      id  => api.get (`/payments/${id}`),
    queryStatus:  id  => api.get (`/payments/${id}/status`), // Fixed: matches your controller
    initiateMpesa:d   => api.post("/payments/mpesa/initiate", d),
    retryPayment: (id, d) => api.post(`/payments/${id}/retry`, d), // Added missing method
    getStats:     ()  => api.get("/payments/stats"), // Added missing method
    createCashPayment: d => api.post("/payments/cash", d), // Admin: Create cash payment
    confirmPayment: id => api.put(`/payments/${id}/confirm`), // Admin: Confirm payment
  };

  const invoicesApi = {
    getAll:      p   => api.get ("/invoices", { params: p }),
    getMy:       p   => api.get ("/invoices/my", { params: p }),
    getById:     id  => api.get (`/invoices/${id}`),
    downloadPdf: id  => api.get (`/invoices/${id}/pdf`, { responseType: "blob" }),
    markAsPaid:  (id,d)=>api.put(`/invoices/${id}/mark-paid`, d)
  };

  const dataUsageApi = {
    getCurrent:        ()      => api.get ("/usage/current"),
    getHistory:        p       => api.get ("/usage/history", { params: p }),
    getAnalytics:      p       => api.get ("/usage/analytics", { params: p }),
    startSession:      d       => api.post("/usage/sessions", d),
    updateSession:     (sid,d) => api.put (`/usage/sessions/${sid}`, d),
    endSession:        sid     => api.post(`/usage/sessions/${sid}/end`)
  };

  // ★ unified, self‑consistent admin namespace
  const adminApi = {
  users: {
    getAll:   p          => api.get ("/admin/users", { params: p }),
    getById:  id         => api.get (`/admin/users/${id}`),
    create:   (d)        => api.post("/admin/users", d),
    update:   (id, d)    => api.put (`/admin/users/${id}`, d),
    delete:   id         => api.delete(`/admin/users/${id}`),
    getUserSubscription: userId => api.get(`/admin/users/${userId}/subscription`),
    updateSubscription: (subscriptionId, data) => api.patch(`/admin/subscriptions/${subscriptionId}`, data)
  },
  getSystemStats: () => api.get("/admin/stats")
};

  return (
    <ApiContext.Provider
      value={{
        api,
        authApi,
        dataPlansApi,
        subscriptionsApi,
        paymentsApi,
        invoicesApi,
        dataUsageApi,
        adminApi
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};