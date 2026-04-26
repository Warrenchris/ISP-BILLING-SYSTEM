import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataPlans from './pages/DataPlans';
import Subscriptions from './pages/Subscriptions';
import Payments from './pages/Payments';
import Invoices from './pages/Invoices';
import DataUsage from './pages/DataUsage';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// New Pages Imports
import UsersManagement from './pages/UsersManagement';
import UserDetails from './pages/UserDetails';
import SupportTickets from './pages/SupportTickets';
import Reports from './pages/Reports';
import StaffRoles from './pages/StaffRoles';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';

import theme from './theme';

function App() {
  const [darkmode, setDarkmode] = React.useState(true); // Default to dark mode for modern look

  const toggleDarkMode = () => {
    setDarkmode(!darkmode);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NotificationProvider>
        <ApiProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route
                  path="/Login"
                  element={
                    <Login
                      darkMode={darkmode}
                      toggleDarkMode={toggleDarkMode}
                    />
                  }
                />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout darkMode={darkmode} toggleDarkMode={toggleDarkMode}>
                        <Routes>
                          <Route path="/" element={<Navigate to="/dashboard" replace />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/data-plans" element={<DataPlans />} />
                          <Route path="/subscriptions" element={<Subscriptions />} />
                          <Route path="/payments" element={<Payments />} />
                          <Route path="/invoices" element={<Invoices />} />
                          <Route path="/data-usage" element={<DataUsage />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="/tickets" element={<SupportTickets />} />
                          <Route path="/notifications" element={<Notifications />} />

                          {/* Admin Only Routes */}
                          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/users" element={<UsersManagement />} />
                            <Route path="/users/:id" element={<UserDetails />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/staff" element={<StaffRoles />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/audit-logs" element={<AuditLogs />} />
                          </Route>
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </AuthProvider>
        </ApiProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
