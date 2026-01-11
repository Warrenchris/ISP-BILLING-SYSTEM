import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
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

// Modern dark theme configuration with glassmorphism support
const createModernTheme = (darkMode = true) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#FFD300', // Primary Accent Yellow
      light: '#FFEB99', // Soft Gold Glow
      dark: '#FFCC00', // Hover/Active Yellow
      contrastText: '#000000',
    },
    secondary: {
      main: '#FFFFFF',
      light: '#F5F5F5',
      dark: '#CCCCCC',
      contrastText: '#000000',
    },
    background: {
      default: darkMode ? '#0B0B0B' : '#f8fafc', // Primary System Background
      paper: darkMode ? '#111111' : '#ffffff', // Secondary Background (Cards)
      sidebar: darkMode ? '#0E0E0E' : '#ffffff', // Sidebar/Navbar Background
    },
    surface: {
      main: darkMode ? 'rgba(15, 15, 15, 0.75)' : 'rgba(255, 255, 255, 0.75)', // Glass Overlay Base
      border: darkMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)', // Glass Border
    },
    text: {
      primary: darkMode ? '#FFFFFF' : '#1a202c',
      secondary: darkMode ? '#BFBFBF' : '#4a5568',
      disabled: darkMode ? '#5C5C5C' : '#9ca3af',
    },
    divider: darkMode ? '#E6B800' : '#e2e8f0', // Border / Divider Gold
    success: {
      main: '#22C55E',
      light: '#4ade80',
      dark: '#15803d',
    },
    warning: {
      main: '#FACC15',
      light: '#fde047',
      dark: '#ca8a04',
    },
    error: {
      main: '#EF4444',
      light: '#f87171',
      dark: '#b91c1c',
    },
    info: {
      main: '#3B82F6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    charts: {
      blue: '#3B82F6',
      green: '#22C55E',
      orange: '#F97316',
      purple: '#A855F7',
      teal: '#14B8A6',
      pink: '#EC4899',
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      background: 'linear-gradient(135deg, #FFD300 0%, #FFCC00 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      letterSpacing: '0.025em',
    },
  },
  shape: {
    borderRadius: 16,
  },
  shadows: [
    'none',
    '0 2px 8px rgba(0, 0, 0, 0.15)',
    '0 4px 16px rgba(0, 0, 0, 0.2)',
    '0 8px 32px rgba(0, 0, 0, 0.3)',
    '0 12px 40px rgba(0, 0, 0, 0.4)',
    '0 16px 48px rgba(0, 0, 0, 0.5)',
    ...Array(19).fill('0 16px 48px rgba(0, 0, 0, 0.5)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: darkMode
            ? '#0a0a0f'
            : '#f8fafc',
          backgroundAttachment: 'fixed',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: darkMode
              ? `radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.15) 0%, transparent 50%),
                 radial-gradient(circle at 100% 0%, rgba(100, 100, 100, 0.2) 0%, transparent 50%)`
              : `radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)`,
            zIndex: -1,
            pointerEvents: 'none',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          background: '#FFD700',
          color: '#000000',
          '&:hover': {
            background: '#E6C200',
          },
        },
        outlined: {
          borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
          color: darkMode ? '#FFFFFF' : '#000000',
          '&:hover': {
            borderColor: '#FFD700',
            background: 'rgba(255, 215, 0, 0.05)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: darkMode ? '#13131a' : '#ffffff',
          backgroundImage: 'none',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '16px',
          boxShadow: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: darkMode ? 'rgba(26, 26, 46, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '12px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            background: darkMode ? 'rgba(26, 26, 46, 0.4)' : 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '12px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '& fieldset': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            },
            '&:hover fieldset': {
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
              boxShadow: '0 0 0 2px rgba(102, 126, 234, 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          background: darkMode ? 'rgba(26, 26, 46, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '20px',
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: darkMode ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: darkMode ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: darkMode ? 'rgba(26, 26, 46, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRight: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          background: darkMode ? 'rgba(26, 26, 46, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '12px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          background: darkMode ? 'rgba(26, 26, 46, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          borderRadius: '12px',
        },
      },
    },
  },
});

// Light theme for comparison
const lightTheme = createModernTheme(false);
const darkTheme = createModernTheme(true);

function App() {
  const [darkmode, setDarkmode] = React.useState(true); // Default to dark mode for modern look

  const toggleDarkMode = () => {
    setDarkmode(!darkmode);
  };

  return (
    <ThemeProvider theme={darkmode ? darkTheme : lightTheme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;
