import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Skeleton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  DataUsage as DataUsageIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Wifi as WifiIcon,
  People as PeopleIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ConfirmationNumber as TicketIcon,
} from '@mui/icons-material';
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
import { APP_DEFAULT_CURRENCY, formatCurrency, formatDate } from '../utils/helpers';
import CashPaymentDialog from '../components/payments/CashPaymentDialog';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { api, subscriptionsApi, paymentsApi, invoicesApi, adminApi, supportService, reportService } = useApi();
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
  const [userGrowthSeries, setUserGrowthSeries] = useState([]);
  const [userGrowthLoading, setUserGrowthLoading] = useState(true);
  const [userGrowthError, setUserGrowthError] = useState(null);

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
  const [adminActivity, setAdminActivity] = useState([]);
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);

  // Quick actions: cash payment dialog state (reuse existing component)
  const [cashDialog, setCashDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUserForCash, setSelectedUserForCash] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashReference, setCashReference] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [cashProcessing, setCashProcessing] = useState(false);

  // Quick actions: invoice generation dialog
  const [genInvoiceOpen, setGenInvoiceOpen] = useState(false);
  const [genInvoiceSubId, setGenInvoiceSubId] = useState('');
  const [genFrom, setGenFrom] = useState('');
  const [genTo, setGenTo] = useState('');
  const [genInvoiceLoading, setGenInvoiceLoading] = useState(false);
  const [aiQuickStats, setAiQuickStats] = useState({
    atRiskCustomers: 'no_data',
    totalAnomalies: 'no_data',
    criticalAnomalies: 'no_data',
    predictedRevenue: 'no_data'
  });
  const [showCriticalAiBanner, setShowCriticalAiBanner] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const aiFailureStreakRef = useRef(0);

  const isAdmin = user?.role === 'admin';

  // Component definitions removed (moved to common components)

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );



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

  const fetchUserGrowthHistory = useCallback(async () => {
    try {
      setUserGrowthLoading(true);
      setUserGrowthError(null);
      const res = await reportService.getUserGrowthChart({ period: 'weekly' });
      const data = res?.data?.data;
      setUserGrowthSeries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching user growth history:', err);
      setUserGrowthError(err);
      setUserGrowthSeries([]);
    } finally {
      setUserGrowthLoading(false);
    }
  }, [reportService]);

  const fetchAdminOverview = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overviewRes, usersRes] = await Promise.all([
        api.get('/admin/dashboard/overview'),
        adminApi.users.getAll(),
      ]);

      const overview = overviewRes?.data?.data || {};
      const users = usersRes?.data?.data?.users || [];

      // Keep PriorityTicketsWidget from existing support endpoint (top 5)
      let pTickets = [];
      try {
        const ticketsRes = await supportService.getAll({ priority: 'high', status: 'open' });
        pTickets = (ticketsRes.data?.data || []).slice(0, 5);
      } catch (e) {
        console.error("Failed to load priority tickets", e);
      }

      setAdminStats((prev) => ({
        ...prev,
        totalUsers: overview.totalUsers || 0,
        activeUsers: overview.activeUsers || 0,
        inactiveUsers: Math.max(0, (overview.totalUsers || 0) - (overview.activeUsers || 0)),
        totalSubscriptions: (overview.activeSubscriptions || 0) + (overview.pendingSubscriptions || 0) + (overview.expiredSubscriptions || 0),
        activeSubscriptions: overview.activeSubscriptions || 0,
        pendingSubscriptions: overview.pendingSubscriptions || 0,
        expiredSubscriptions: overview.expiredSubscriptions || 0,
        totalRevenue: overview.totalRevenue || 0,
        monthlyRevenue: overview.revenueThisMonth || 0,
        revenuePeriodLabel: 'Completed payments · all-time total',
        currency: overview.currency || APP_DEFAULT_CURRENCY,
        recentUsers: users.slice(0, 5),
        adminUsers: users.filter(u => u.role === 'admin'),
        priorityTickets: pTickets,
      }));
    } catch (error) {
      console.error('Error fetching admin overview:', error);
      showAlert('Error loading admin statistics', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [adminApi, api, supportService]);

  const fetchAdminActivity = useCallback(async () => {
    try {
      setAdminActivityLoading(true);
      const res = await api.get('/admin/dashboard/activity');
      const data = res?.data?.data || [];
      setAdminActivity(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admin activity:', error);
      setAdminActivity([]);
    } finally {
      setAdminActivityLoading(false);
    }
  }, [api]);

  const fetchUsersForCash = useCallback(async () => {
    try {
      setUserSearchLoading(true);
      const response = await adminApi.users.getAll();
      setUsers(response.data?.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUserSearchLoading(false);
    }
  }, [adminApi]);

  const fetchUserSubscriptionForCash = useCallback(async (userId) => {
    try {
      setLoadingSubscription(true);
      const response = await adminApi.users.getUserSubscription(userId);
      let subscription = null;
      if (response.data?.data?.subscriptions) {
        subscription = response.data.data.subscriptions.find(sub => sub.status === 'active' && new Date(sub.endDate) > new Date());
      }

      if (subscription) {
        setUserSubscription(subscription);
        const amt = subscription.DataPlan?.price || subscription.amount || 0;
        setCashAmount(String(amt));
        setCashDescription(`Payment for ${subscription.DataPlan?.name || 'ISP services'}`);
      } else {
        setUserSubscription(null);
        setCashAmount('');
        setCashDescription('Cash payment for ISP services');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setUserSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  }, [adminApi]);

  const handleCashPaymentQuick = async () => {
    if (!selectedUserForCash || !cashAmount || !cashReference) return;
    try {
      setCashProcessing(true);
      await paymentsApi.createCashPayment({
        userId: selectedUserForCash.id,
        amount: parseFloat(cashAmount),
        reference: cashReference,
        description: cashDescription,
        subscriptionId: userSubscription?.id || null,
      });
      setCashDialog(false);
      setSelectedUserForCash(null);
      setCashAmount('');
      setCashReference('');
      setCashDescription('');
      fetchAdminOverview();
      fetchAdminActivity();
    } catch (e) {
      console.error(e);
    } finally {
      setCashProcessing(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!genInvoiceSubId || !genFrom || !genTo) return;
    try {
      setGenInvoiceLoading(true);
      await api.post(`/invoices/generate/${genInvoiceSubId}`, {
        billingPeriodStart: genFrom,
        billingPeriodEnd: genTo,
        force: true
      });
      setGenInvoiceOpen(false);
      setGenInvoiceSubId('');
      setGenFrom('');
      setGenTo('');
      fetchAdminOverview();
      fetchAdminActivity();
    } catch (e) {
      console.error(e);
    } finally {
      setGenInvoiceLoading(false);
    }
  };

  const fetchAiQuickStats = useCallback(async () => {
    if (aiUnavailable) return;
    try {
      const summaryRes = await aiService.getDashboardSummary();
      
      aiFailureStreakRef.current = 0;
      setAiUnavailable(false);

      const summary = summaryRes.data?.data || summaryRes.data || {};
      const anomalyList = summary.anomalies?.list || [];
      const critical = summary.anomalies?.critical || 0;

      setAiQuickStats({
        atRiskCustomers: summary?.churn?.totalAtRisk ?? 'no_data',
        totalAnomalies: summary?.anomalies?.total ?? (anomalyList.length || 'no_data'),
        criticalAnomalies: summary?.anomalies?.critical ?? (critical || 'no_data'),
        predictedRevenue: summary?.revenue?.predicted ?? 'no_data'
      });
      setShowCriticalAiBanner((summary?.anomalies?.critical ?? critical) > 0);
    } catch (error) {
      console.error('Error fetching AI quick stats:', error);
      aiFailureStreakRef.current += 1;
      if (aiFailureStreakRef.current >= 3) {
        setAiUnavailable(true);
      }
    }
  }, [aiUnavailable]);

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
      fetchAdminOverview();
      fetchAdminActivity();
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
      fetchAdminOverview();
      fetchAdminActivity();
      fetchAiQuickStats();
      fetchUserGrowthHistory();
    }
  }, [
    isAdmin,
    fetchDashboardData,
    fetchUsageHistory,
    fetchAdminOverview,
    fetchAdminActivity,
    fetchAiQuickStats,
    fetchUserGrowthHistory,
  ]);

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
                aiFailureStreakRef.current = 0;
                setAiUnavailable(false);
                fetchDashboardData();
                fetchUsageHistory();
                fetchAdminOverview();
                fetchAdminActivity();
                fetchAiQuickStats();
                fetchUserGrowthHistory();
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

        {/* Quick Actions (admin only) */}
        <CustomCard className="mb-6">
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" flexWrap="wrap" gap={1.5}>
              <Button
                variant="contained"
                onClick={() => navigate('/admin-users')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                New Subscription
              </Button>
              <Button
                variant="outlined"
                onClick={async () => {
                  await fetchUsersForCash();
                  setCashDialog(true);
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Record Payment
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/support-tickets')}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Assign Ticket
              </Button>
              <Button
                variant="outlined"
                onClick={() => setGenInvoiceOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Generate Invoice
              </Button>
            </Box>
          </CardContent>
        </CustomCard>

        {showCriticalAiBanner && (
          <Alert
            severity="warning"
            sx={{ mb: 3, cursor: 'pointer' }}
            onClick={() => navigate('/ai-dashboard', { state: { scrollTo: 'anomalies' } })}
          >
            ⚠️ {aiQuickStats.criticalAnomalies} critical billing anomalies detected. View Details →
          </Alert>
        )}

        {aiUnavailable && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            AI service temporarily unavailable
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

          {/* Recent Activity */}
          <CustomCard className="mb-8">
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Activity
                </Typography>
                <Button
                  variant="text"
                  onClick={fetchAdminActivity}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Refresh
                </Button>
              </Box>
              {adminActivityLoading ? (
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
              ) : (
                <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                  <List dense>
                    {(adminActivity || []).map((ev) => {
                      const type = String(ev.type || '').toLowerCase();
                      const Icon =
                        type === 'payment' ? PaymentIcon :
                          type === 'signup' ? PersonIcon :
                            type === 'ticket' ? TicketIcon :
                              RefreshIcon;
                      return (
                        <ListItem key={ev.id} sx={{ px: 0 }}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: theme.palette.primary.main }}>
                              <Icon fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={ev.description}
                            secondary={`${ev.user?.name || ''}${ev.user?.email ? ` · ${ev.user.email}` : ''} · ${formatDate(ev.timestamp)}`}
                          />
                        </ListItem>
                      );
                    })}
                    {(!adminActivity || adminActivity.length === 0) && (
                      <Typography color="text.secondary">No recent activity.</Typography>
                    )}
                  </List>
                </Box>
              )}
            </CardContent>
          </CustomCard>

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
                  <Typography variant="h5" sx={{ color: aiQuickStats.atRiskCustomers > 0 && aiQuickStats.atRiskCustomers !== 'no_data' ? theme.palette.error.main : 'text.primary', fontWeight: 700 }}>
                    {aiQuickStats.atRiskCustomers === 'no_data' ? 'No data' : `${aiQuickStats.atRiskCustomers} customers at churn risk`}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Anomalies</Typography>
                  <Typography variant="h5" sx={{ color: aiQuickStats.totalAnomalies > 0 && aiQuickStats.totalAnomalies !== 'no_data' ? theme.palette.warning.main : 'text.primary', fontWeight: 700 }}>
                    {aiQuickStats.totalAnomalies === 'no_data' ? 'No data' : `${aiQuickStats.totalAnomalies} active anomalies`}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="body2" color="text.secondary">Predicted Revenue</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {aiQuickStats.predictedRevenue === 'no_data' ? 'No data' : formatCurrency(aiQuickStats.predictedRevenue)}
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
          {usageHistoryLoading || userGrowthLoading ? (
            <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2, mb: 4 }} />
          ) : usageHistoryError || userGrowthError ? (
            <ErrorState
              message="Failed to load dashboard chart data"
              onRetry={() => {
                fetchUsageHistory();
                fetchUserGrowthHistory();
              }}
            />
          ) : userGrowthSeries.length === 0 ? (
            <EmptyState
              icon={<PeopleIcon />}
              title="No user growth data"
              subtitle="User growth trend will appear here once new user registrations are recorded."
            />
          ) : (
            <DashboardCharts
              userGrowthHistory={userGrowthSeries}
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

        {/* Quick action dialogs (admin only) */}
        <CashPaymentDialog
          open={cashDialog}
          onClose={() => setCashDialog(false)}
          onPay={handleCashPaymentQuick}
          processing={cashProcessing}
          users={users}
          selectedUser={selectedUserForCash}
          setSelectedUser={(e, v) => {
            setSelectedUserForCash(v);
            if (v) fetchUserSubscriptionForCash(v.id);
          }}
          userSearchLoading={userSearchLoading}
          loadingSubscription={loadingSubscription}
          userSubscription={userSubscription}
          cashAmount={cashAmount}
          setCashAmount={setCashAmount}
          cashReference={cashReference}
          setCashReference={setCashReference}
          cashDescription={cashDescription}
          setCashDescription={setCashDescription}
        />

        <Dialog open={genInvoiceOpen} onClose={() => !genInvoiceLoading && setGenInvoiceOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Subscription ID"
              value={genInvoiceSubId}
              onChange={(e) => setGenInvoiceSubId(e.target.value)}
              sx={{ mb: 2 }}
              disabled={genInvoiceLoading}
            />
            <TextField
              fullWidth
              type="date"
              label="From"
              value={genFrom}
              onChange={(e) => setGenFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 2 }}
              disabled={genInvoiceLoading}
            />
            <TextField
              fullWidth
              type="date"
              label="To"
              value={genTo}
              onChange={(e) => setGenTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              disabled={genInvoiceLoading}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setGenInvoiceOpen(false)} disabled={genInvoiceLoading}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleGenerateInvoice}
              disabled={genInvoiceLoading || !genInvoiceSubId || !genFrom || !genTo}
            >
              {genInvoiceLoading ? <CircularProgress size={18} color="inherit" /> : 'Generate'}
            </Button>
          </DialogActions>
        </Dialog>
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