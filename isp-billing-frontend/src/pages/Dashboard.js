import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  useTheme,
  alpha,
  Skeleton } from '@mui/material';
import {
  DataUsage as DataUsageIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Wifi as WifiIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';
import aiService from '../services/aiService';
import CustomCard from '../components/common/CustomCard';
import StatCard from '../components/common/StatCard';
import AdminStatsOverview from '../components/dashboard/AdminStatsOverview';
import AdminPersonalAccount from '../components/dashboard/AdminPersonalAccount';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import RecentUsersTable from '../components/dashboard/RecentUsersTable';
import PriorityTicketsWidget from '../components/dashboard/PriorityTicketsWidget';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import { APP_DEFAULT_CURRENCY, formatCurrency } from '../utils/helpers';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { api, subscriptionsApi, paymentsApi, invoicesApi, adminApi, supportService } = useApi();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Payment State
  const [payDlgOpen, setPayDlgOpen] = useState(false);
  const [payPhoneNumber, setPayPhoneNumber] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [payStatus, setPayStatus] = useState(null); // 'pending', 'completed', 'failed'
  // const [adminPrivilegesOpen, setAdminPrivilegesOpen] = useState(false);
  // const [selectedUser, setSelectedUser] = useState(null);

  const showAlert = (message, severity = 'info') => {
    console.log(`[${severity.toUpperCase()}] ${message}`);
  };

  const [dashboardData, setDashboardData] = useState({
    currentSubscription: null,
    recentPayments: [],
    pendingInvoices: [] });

  const [usageHistorySeries, setUsageHistorySeries] = useState([]);
  const [usageHistoryLoading, setUsageHistoryLoading] = useState(true);
  const [usageHistoryError, setUsageHistoryError] = useState(null);

  // Admin-specific state
  const [adminStats, setAdminStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    suspendedUsers: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    expiredSubscriptions: 0,
    pendingSubscriptions: 0,
    suspendedSubscriptions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalUsersTrend: null,
    activeUsersTrend: null,
    activeSubscriptionsTrend: null,
    totalRevenueTrend: null,
    revenuePeriodLabel: '',
    currency: APP_DEFAULT_CURRENCY,
    recentUsers: [],
    adminUsers: [],
    priorityTickets: [] });
  const [aiQuickStats, setAiQuickStats] = useState({
    atRiskCustomers: 0,
    totalAnomalies: 0,
    criticalAnomalies: 0,
    predictedRevenue: 0
  });
  const [showCriticalAiBanner, setShowCriticalAiBanner] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Component definitions removed (moved to common components)

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );



  // UTILITY FUNCTIONS

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!dashboardData.currentSubscription) return 0;
    const subscription = dashboardData.currentSubscription;

    if (subscription.dataUsagePercentage !== undefined) {
      return subscription.dataUsagePercentage;
    }

    const dataLimit = subscription.DataPlan?.dataLimit || 1;
    const dataRemaining = subscription.dataRemaining || 0;
    const dataUsed = dataLimit - dataRemaining;
    return Math.min((dataUsed / dataLimit) * 100, 100);
  };

  // DATA FETCHING FUNCTIONS

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [subscriptionRes, paymentsRes, invoicesRes] = await Promise.allSettled([
        subscriptionsApi.getCurrent(),
        paymentsApi.getMyPayments({ limit: 5 }),
        invoicesApi.getMy({ status: 'pending', limit: 5 }),
      ]);

      const newData = {
        currentSubscription: subscriptionRes.status === 'fulfilled' && subscriptionRes.value?.data?.success
          ? subscriptionRes.value.data.data.subscription
          : null,
        recentPayments: paymentsRes.status === 'fulfilled' && paymentsRes.value?.data?.success
          ? paymentsRes.value.data.data
          : [],
        pendingInvoices: invoicesRes.status === 'fulfilled' && invoicesRes.value?.data?.success
          ? invoicesRes.value.data.data.invoices
          : [] };

      setDashboardData(newData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [subscriptionsApi, paymentsApi, invoicesApi]);

  const fetchUsageHistory = useCallback(async () => {
    try {
      setUsageHistoryLoading(true);
      setUsageHistoryError(null);
      const res = await api.get('/dashboard/usage-history', { params: { period: '7d' } });
      const data = res.data?.data;
      setUsageHistorySeries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching dashboard usage history:', err);
      setUsageHistoryError(err);
      setUsageHistorySeries([]);
    } finally {
      setUsageHistoryLoading(false);
    }
  }, [api]);

  const fetchAdminStats = useCallback(async () => {
    try {
      setRefreshing(true);

      let revenuePeriodLabel = '';
      try {
        const statsRes = await api.get('/dashboard/stats');
        const label = statsRes?.data?.data?.revenuePeriodLabel;
        if (label != null && String(label).trim() !== '') {
          revenuePeriodLabel = String(label).trim();
        }
      } catch {
        /* leave subtitle empty when stats endpoint fails */
      }

      const usersResponse = await adminApi.users.getAll();
      const users = usersResponse.data?.data?.users || [];

      // Get ALL completed payments (not just current month)
      const paymentsResponse = await paymentsApi.getAllPayments({
        status: 'completed'
      });

      const payments = paymentsResponse.data?.data?.payments || paymentsResponse.data?.data || [];

      const subscriptionsResponse = await subscriptionsApi.getAll();
      const subscriptions = subscriptionsResponse.data?.data?.subscriptions || [];
      
      let pTickets = [];
      try {
        const ticketsRes = await supportService.getAll({ priority: 'high', status: 'open' });
        pTickets = (ticketsRes.data?.data || []).slice(0, 5); // get top 5 open high-priority tickets
      } catch (e) {
        console.error("Failed to load priority tickets", e);
      }

      // Get current month payments for monthly revenue
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const monthlyPayments = payments.filter(payment => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate.getFullYear() === currentYear &&
          paymentDate.getMonth() + 1 === currentMonth;
      });

      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.status === 'active').length;
      const inactiveUsers = users.filter(u => u.status === 'inactive').length;
      const suspendedUsers = users.filter(u => u.status === 'suspended').length;

      const totalSubscriptions = subscriptions.length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired').length;
      const pendingSubscriptions = subscriptions.filter(s => s.status === 'pending').length;
      const suspendedSubscriptions = subscriptions.filter(s => s.status === 'suspended').length;

      // Calculate total revenue from ALL completed payments (like in Payments page)
      const totalRevenue = payments.reduce((total, payment) => {
        const numericAmount = parseFloat(
          String(payment.amount || '0').replace(/[^\d.]/g, '')
        );
        return total + (isNaN(numericAmount) ? 0 : numericAmount);
      }, 0);

      // Calculate monthly revenue from current month payments only
      const monthlyRevenue = monthlyPayments.reduce((total, payment) => {
        const numericAmount = parseFloat(
          String(payment.amount || '0').replace(/[^\d.]/g, '')
        );
        return total + (isNaN(numericAmount) ? 0 : numericAmount);
      }, 0);

      const pctChange = (current, previous) => {
        if (previous === 0) return current === 0 ? 0 : 100;
        return ((current - previous) / previous) * 100;
      };

      const MS_30 = 30 * 24 * 60 * 60 * 1000;
      const nowTs = Date.now();
      const endNow = new Date(nowTs);
      const startCurrent = new Date(nowTs - MS_30);
      const startPrev = new Date(nowTs - 2 * MS_30);
      const endPrev = startCurrent;

      const inRange = (dateStr, start, end) => {
        if (!dateStr) return false;
        const t = new Date(dateStr).getTime();
        return t >= start.getTime() && t < end.getTime();
      };

      const countUsersCreatedBetween = (start, end) =>
        users.filter((u) => u.createdAt && inRange(u.createdAt, start, end)).length;

      const totalUsersTrend = pctChange(
        countUsersCreatedBetween(startCurrent, endNow),
        countUsersCreatedBetween(startPrev, endPrev)
      );

      const countActiveUsersCreatedBetween = (start, end) =>
        users.filter(
          (u) =>
            u.status === 'active' &&
            u.createdAt &&
            inRange(u.createdAt, start, end)
        ).length;

      const activeUsersTrend = pctChange(
        countActiveUsersCreatedBetween(startCurrent, endNow),
        countActiveUsersCreatedBetween(startPrev, endPrev)
      );

      const countActiveSubsCreatedBetween = (start, end) =>
        subscriptions.filter(
          (s) =>
            s.status === 'active' &&
            s.createdAt &&
            inRange(s.createdAt, start, end)
        ).length;

      const activeSubscriptionsTrend = pctChange(
        countActiveSubsCreatedBetween(startCurrent, endNow),
        countActiveSubsCreatedBetween(startPrev, endPrev)
      );

      const parsePaymentAmount = (p) => {
        const n = parseFloat(String(p.amount || '0').replace(/[^\d.]/g, ''));
        return isNaN(n) ? 0 : n;
      };

      const sumPaymentsBetween = (start, end) =>
        payments.reduce((sum, p) => {
          if (!p.createdAt || !inRange(p.createdAt, start, end)) return sum;
          return sum + parsePaymentAmount(p);
        }, 0);

      const revenueLast30 = sumPaymentsBetween(startCurrent, endNow);
      const revenuePrev30 = sumPaymentsBetween(startPrev, endPrev);
      const totalRevenueTrend = pctChange(revenueLast30, revenuePrev30);

      setAdminStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        totalSubscriptions,
        activeSubscriptions,
        expiredSubscriptions,
        pendingSubscriptions,
        suspendedSubscriptions,
        totalRevenue,
        monthlyRevenue,
        totalUsersTrend,
        activeUsersTrend,
        activeSubscriptionsTrend,
        totalRevenueTrend,
        revenuePeriodLabel,
        currency: APP_DEFAULT_CURRENCY,
        recentUsers: users.slice(0, 5),
        adminUsers: users.filter(u => u.role === 'admin'),
        priorityTickets: pTickets
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      showAlert('Error loading admin statistics', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [adminApi, api, paymentsApi, subscriptionsApi]);

  const fetchAiQuickStats = useCallback(async () => {
    try {
      const [summaryRes, anomaliesRes] = await Promise.allSettled([
        aiService.getDashboardSummary(),
        aiService.getAnomalies()
      ]);

      const summary = summaryRes.status === 'fulfilled' ? (summaryRes.value.data?.data || {}) : {};
      const anomaliesPayload = anomaliesRes.status === 'fulfilled' ? (anomaliesRes.value.data?.data || {}) : {};
      const anomalyList = Array.isArray(anomaliesPayload.anomalies) ? anomaliesPayload.anomalies : [];
      const critical = anomalyList.filter((item) => {
        const severity = String(item.severity || item.level || '').toLowerCase();
        return severity === 'critical' || severity === 'high';
      }).length;

      setAiQuickStats({
        atRiskCustomers: summary?.churn?.totalAtRisk || 0,
        totalAnomalies: summary?.anomalies?.total || anomalyList.length || 0,
        criticalAnomalies: summary?.anomalies?.critical ?? critical,
        predictedRevenue: summary?.revenue?.predicted || 0
      });
      setShowCriticalAiBanner((summary?.anomalies?.critical ?? critical) > 0);
    } catch (error) {
      console.error('Error fetching AI quick stats:', error);
    }
  }, []);

  // ACTION HANDLERS

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'activate':
          await adminApi.users.update(userId, { status: 'active' });
          break;
        case 'suspend':
          await adminApi.users.update(userId, { status: 'suspended' });
          break;
        case 'makeAdmin':
          await adminApi.users.update(userId, { role: 'admin' });
          break;
        case 'removeAdmin':
          await adminApi.users.update(userId, { role: 'customer' });
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this user?')) {
            await adminApi.users.delete(userId);
          }
          break;
        default:
          break;
      }
      fetchAdminStats();
    } catch (error) {
      console.error('Error performing user action:', error);
    }
  };

  // --- Payment Logic Integration ---
  const handlePayClick = () => {
    setPayPhoneNumber(user?.phoneNumber || "");
    setPayDlgOpen(true);
    setPayStatus(null);
  };

  const pollPayment = async (paymentId) => {
    setPaymentPolling(true);
    setPayStatus('pending');

    let attempts = 0;
    const max = 20;

    const check = async () => {
      if (attempts >= max) {
        setPaymentPolling(false);
        setPayStatus('timeout');
        showAlert("Payment check timed out. Please check status later.", "warning");
        return;
      }
      try {
        const res = await paymentsApi.checkStatus(paymentId);
        const st = res.data?.payment?.status;
        if (st === 'completed') {
          setPaymentPolling(false);
          setPayStatus('completed');
          showAlert("Payment successful!", "success");
          fetchDashboardData(); // Refresh dashboard
          setTimeout(() => {
            setPayDlgOpen(false);
            setPayStatus(null);
          }, 2000);
        } else if (st === 'failed' || st === 'cancelled') {
          setPaymentPolling(false);
          setPayStatus('failed');
          showAlert("Payment failed", "error");
        } else {
          attempts++;
          setTimeout(check, 3000);
        }
      } catch (e) {
        attempts++;
        setTimeout(check, 3000);
      }
    };
    check();
  };

  const confirmPay = async () => {
    if (!dashboardData.currentSubscription || !payPhoneNumber) return;
    try {
      setPaying(true);
      const res = await paymentsApi.initiateSubscriptionPayment({
        subscriptionId: dashboardData.currentSubscription.id,
        phoneNumber: payPhoneNumber
      });
      const pid = res.data?.payment?.id;

      showAlert("Payment initiated. Check phone.", "success");

      if (pid) {
        setPaying(false);
        pollPayment(pid);
      } else {
        setPaying(false);
        setPayDlgOpen(false);
      }

    } catch (e) {
      console.error(e);
      setPaying(false);
      showAlert(e.response?.data?.message || "Payment init failed", "error");
    }
  };

  // CHART DATA

  const pieData = [
    { name: 'Used', value: getUsagePercentage(), color: theme.palette.primary.main },
    { name: 'Remaining', value: 100 - getUsagePercentage(), color: alpha(theme.palette.primary.main, 0.2) },
  ];

  const userStatusData = [
    { name: 'Active', value: adminStats.activeUsers, color: theme.palette.success.main },
    { name: 'Inactive', value: adminStats.inactiveUsers, color: theme.palette.warning.main },
    { name: 'Suspended', value: adminStats.suspendedUsers, color: theme.palette.error.main },
  ];

  // EFFECTS

  useEffect(() => {
    fetchDashboardData();
    fetchUsageHistory();
    if (isAdmin) {
      fetchAdminStats();
      fetchAiQuickStats();
    }
  }, [isAdmin, fetchDashboardData, fetchUsageHistory, fetchAdminStats, fetchAiQuickStats]);

  // LOADING STATE

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <LinearProgress sx={{ width: '50%' }} />
        </Box>
      </Box>
    );
  }

  // ADMIN DASHBOARD VIEW
  if (isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1 }}
            >
              Admin Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive overview of your ISP billing system
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={<AdminIcon />}
              label="Administrator"
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
                color: theme.palette.primary.contrastText,
                fontWeight: 500 }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchDashboardData();
                fetchUsageHistory();
                fetchAdminStats();
              }}
              disabled={refreshing}
              sx={{
                
                textTransform: 'none',
                fontWeight: 500 }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Box>

        {showCriticalAiBanner && (
          <Alert
            severity="warning"
            sx={{ mb: 3, cursor: 'pointer' }}
            onClick={() => navigate('/ai-dashboard', { state: { scrollTo: 'anomalies' } })}
          >
            ⚠️ {aiQuickStats.criticalAnomalies} critical billing anomalies detected. View Details →
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem' } }}
          >
            <Tab label="Overview" icon={<DataUsageIcon />} iconPosition="start" />
            <Tab label="User Statistics" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Admin Privileges" icon={<SecurityIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Admin Overview */}
          <AdminStatsOverview stats={adminStats} />

          <CustomCard className="mb-8">
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Quick Stats
                </Typography>
                <Button
                  variant="text"
                  onClick={() => navigate('/ai-dashboard')}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  View AI Dashboard →
                </Button>
              </Box>
              <Grid container spacing={2} mt={0.5}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Churn Risk</Typography>
                  <Typography variant="h5" sx={{ color: aiQuickStats.atRiskCustomers > 0 ? theme.palette.error.main : 'text.primary', fontWeight: 700 }}>
                    {aiQuickStats.atRiskCustomers} customers at churn risk
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Anomalies</Typography>
                  <Typography variant="h5" sx={{ color: aiQuickStats.totalAnomalies > 0 ? theme.palette.warning.main : 'text.primary', fontWeight: 700 }}>
                    {aiQuickStats.totalAnomalies} active anomalies
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Predicted Revenue</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {formatCurrency(aiQuickStats.predictedRevenue || 0)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </CustomCard>

          {/* Personal Account Section for Admin */}
          <AdminPersonalAccount
            subscription={dashboardData.currentSubscription}
            recentPaymentsCount={dashboardData.recentPayments.length}
            pendingInvoicesCount={dashboardData.pendingInvoices.length}
            usagePercentage={getUsagePercentage()}
          />

          {/* Priority Tickets Widget */}
          <PriorityTicketsWidget tickets={adminStats.priorityTickets} />

          {/* Charts Section */}
          {usageHistoryLoading ? (
            <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2, mb: 4 }} />
          ) : usageHistoryError ? (
            <ErrorState
              message="Failed to load usage data"
              onRetry={fetchUsageHistory}
            />
          ) : usageHistorySeries.length === 0 ? (
            <EmptyState
              icon={<DataUsageIcon />}
              title="No usage data"
              subtitle="Usage will appear here once data usage sessions are recorded."
            />
          ) : (
            <DashboardCharts
              usageHistory={usageHistorySeries}
              userStatusData={userStatusData}
            />
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* User Statistics */}
          <RecentUsersTable
            users={adminStats.recentUsers}
            onAction={handleUserAction}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Admin Privileges */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <CustomCard>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Administrator Privileges
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Manage system-wide settings and user permissions.
                  </Typography>

                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box
                      sx={{
                        p: 3,
                        
                        background: 'rgba(102, 126, 234, 0.1)',
                        border: '1px solid rgba(102, 126, 234, 0.2)' }}
                    >
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        System Administration
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Full access to user management, billing, and system configuration.
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Chip label="User Management" size="small" />
                        <Chip label="Billing Control" size="small" />
                        <Chip label="System Config" size="small" />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        p: 3,
                        
                        background: 'rgba(0, 212, 170, 0.1)',
                        border: '1px solid rgba(0, 212, 170, 0.2)' }}
                    >
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Financial Management
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Access to payment processing, invoicing, and financial reports.
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Chip label="Payment Processing" size="small" />
                        <Chip label="Invoice Management" size="small" />
                        <Chip label="Financial Reports" size="small" />
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        p: 3,
                        
                        background: 'rgba(255, 184, 0, 0.1)',
                        border: '1px solid rgba(255, 184, 0, 0.2)' }}
                    >
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Data & Analytics
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        View comprehensive analytics and generate detailed reports.
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Chip label="Usage Analytics" size="small" />
                        <Chip label="Performance Metrics" size="small" />
                        <Chip label="Custom Reports" size="small" />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </CustomCard>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>
    );
  }

  // REGULAR USER DASHBOARD
  return (
    <Box sx={{ p: 3 }}>
      <Box mb={4}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1 }}
        >
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your account overview and recent activity
        </Typography>
      </Box>

      {/* Pending Payment Alert */}
      {dashboardData.currentSubscription?.paymentStatus === 'pending' && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={handlePayClick}>
              Pay Now
            </Button>
          }
          sx={{ mb: 4 }}
        >
          Your current subscription payment is pending. Services may be limited.
        </Alert>
      )}

      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<DataUsageIcon />}
            title="Data Usage"
            value={`${getUsagePercentage().toFixed(1)}%`}
            subtitle="of current plan"
            color="#667eea"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<PaymentIcon />}
            title="Recent Payments"
            value={dashboardData.recentPayments.length}
            subtitle="this month"
            color="#22C55E"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ReceiptIcon />}
            title="Pending Invoices"
            value={dashboardData.pendingInvoices.length}
            subtitle="require attention"
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<WifiIcon />}
            title="Connection"
            value="Active"
            subtitle="stable connection"
            color="#3B82F6"
          />
        </Grid>
      </Grid>

      {/* Current Subscription Card */}
      <CustomCard className="mb-8">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Current Subscription
          </Typography>

          {dashboardData.currentSubscription ? (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <Box mb={3}>
                  <Typography variant="h6" gutterBottom>
                    {dashboardData.currentSubscription.DataPlan?.name || 'Current Plan'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Data Usage Progress
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={getUsagePercentage()}
                    sx={{
                      height: 12,
                      
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)` } }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {getUsagePercentage().toFixed(1)}% used
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%">
                  {dashboardData.currentSubscription.paymentStatus === 'pending' ? (
                    <Box textAlign="center">
                      <Chip label="Payment Pending" color="warning" sx={{ mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Complete payment to activate full speed.
                      </Typography>
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={handlePayClick}
                        sx={{ }}
                      >
                        Pay Now
                      </Button>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Active Subscription
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Subscribe to a data plan to get started
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/data-plans')}
                sx={{
                  background: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: theme.palette.primary.dark }
                }}
              >
                View Plans
              </Button>
            </Box>
          )}
        </CardContent>
      </CustomCard>

      {/* Usage Chart */}
      <CustomCard>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Weekly Usage Trend
          </Typography>
          {usageHistoryLoading ? (
            <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
          ) : usageHistoryError ? (
            <ErrorState
              message="Failed to load usage data"
              onRetry={fetchUsageHistory}
            />
          ) : usageHistorySeries.length === 0 ? (
            <EmptyState
              icon={<DataUsageIcon />}
              title="No usage data"
              subtitle="Usage will appear here once data usage sessions are recorded."
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usageHistorySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    v ? new Date(`${v}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
                  }
                  stroke="#b8c5d6"
                />
                <YAxis stroke="#b8c5d6" />
                <Bar
                  dataKey="usageMB"
                  fill="url(#colorGradient)"
                  radius={[4, 4, 0, 0]}
                />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#B28F00" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </CustomCard>

      {/* PAY DIALOG */}
      <Dialog
        open={payDlgOpen}
        onClose={() => !paying && !paymentPolling && setPayDlgOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Complete Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {paymentPolling ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={50} sx={{ mb: 2 }} />
              <Typography variant="h6">Waiting for M-Pesa...</Typography>
              <Typography variant="body2" color="text.secondary">Check your phone.</Typography>
            </Box>
          ) : payStatus === 'completed' ? (
            <Box textAlign="center" py={4}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />
              <Typography variant="h5" color="success.main">Paid Successfully!</Typography>
            </Box>
          ) : (
            <>
              <Typography gutterBottom>
                Pay for subscription <b>{dashboardData.currentSubscription?.DataPlan?.name}</b>.
              </Typography>
              <TextField
                fullWidth
                label="M-Pesa Number"
                value={payPhoneNumber}
                onChange={(e) => setPayPhoneNumber(e.target.value)}
                placeholder="07..."
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!paymentPolling && payStatus !== 'completed' && (
            <>
              <Button onClick={() => setPayDlgOpen(false)} disabled={paying}>Cancel</Button>
              <Button variant="contained" color="success" onClick={confirmPay} disabled={paying}>
                {paying ? <CircularProgress size={20} /> : "Pay Now"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;