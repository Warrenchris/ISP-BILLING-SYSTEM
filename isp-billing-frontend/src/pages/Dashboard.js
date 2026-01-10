import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  Chip,
  Button,
  Alert,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  CircularProgress,
  TextField,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  DataUsage as DataUsageIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  Wifi as WifiIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Subscriptions as SubscriptionsIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  MonetizationOn as MoneyIcon,
  Refresh as RefreshIcon,
  SupervisorAccount as SupervisorIcon,
  Block as BlockIcon,
  CheckCircleOutline as ActivateIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';
import CustomCard from '../components/common/CustomCard';
import StatCard from '../components/common/StatCard';
import AdminStatsOverview from '../components/dashboard/AdminStatsOverview';
import AdminPersonalAccount from '../components/dashboard/AdminPersonalAccount';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import RecentUsersTable from '../components/dashboard/RecentUsersTable';

const Dashboard = () => {
  const { user } = useAuth();
  const { subscriptionsApi, paymentsApi, invoicesApi, adminApi } = useApi();
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
  const [adminPrivilegesOpen, setAdminPrivilegesOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const showAlert = (message, severity = 'info') => {
    console.log(`[${severity.toUpperCase()}] ${message}`);
  };

  const [dashboardData, setDashboardData] = useState({
    currentSubscription: null,
    recentPayments: [],
    pendingInvoices: [],
    usageHistory: [],
  });

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
    recentUsers: [],
    adminUsers: [],
  });

  const isAdmin = user?.role === 'admin';

  // Component definitions removed (moved to common components)

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );



  // UTILITY FUNCTIONS

  const generateMockUsageHistory = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      usage: Math.floor(Math.random() * 500) + 100,
    }));
  };

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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [subscriptionRes, paymentsRes, invoicesRes] = await Promise.allSettled([
        subscriptionsApi.getCurrent(),
        paymentsApi.getPaymentHistory({ limit: 5 }),
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
          : [],
        usageHistory: generateMockUsageHistory(),
      };

      setDashboardData(newData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      setRefreshing(true);

      const usersResponse = await adminApi.users.getAll();
      const users = usersResponse.data?.data?.users || [];

      // Get ALL completed payments (not just current month)
      const paymentsResponse = await paymentsApi.getAllPayments({
        status: 'completed'
      });

      const payments = paymentsResponse.data?.data?.payments || paymentsResponse.data?.data || [];

      const subscriptionsResponse = await subscriptionsApi.getAll();
      const subscriptions = subscriptionsResponse.data?.data?.subscriptions || [];

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
        totalRevenue, // This is now the total from all completed payments
        monthlyRevenue, // This remains monthly only
        recentUsers: users.slice(0, 5),
        adminUsers: users.filter(u => u.role === 'admin')
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      showAlert('Error loading admin statistics', 'error');
    } finally {
      setRefreshing(false);
    }
  };

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
    { name: 'Used', value: getUsagePercentage(), color: '#FFD700' },
    { name: 'Remaining', value: 100 - getUsagePercentage(), color: alpha('#FFD700', 0.2) },
  ];

  const userStatusData = [
    { name: 'Active', value: adminStats.activeUsers, color: '#00d4aa' },
    { name: 'Inactive', value: adminStats.inactiveUsers, color: '#ffb800' },
    { name: 'Suspended', value: adminStats.suspendedUsers, color: '#ff6b6b' },
  ];

  const subscriptionStatusData = [
    { name: 'Active', value: adminStats.activeSubscriptions, color: '#00d4aa' },
    { name: 'Expired', value: adminStats.expiredSubscriptions, color: '#ff6b6b' },
    { name: 'Pending', value: adminStats.pendingSubscriptions, color: '#ffb800' },
    { name: 'Suspended', value: adminStats.suspendedSubscriptions, color: '#9e9e9e' },
  ];

  // EFFECTS

  useEffect(() => {
    fetchDashboardData();
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin]);

  // LOADING STATE

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          Dashboard
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <LinearProgress sx={{ width: '50%', borderRadius: 2 }} />
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1,
              }}
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
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 500,
              }}
            />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => {
                fetchDashboardData();
                fetchAdminStats();
              }}
              disabled={refreshing}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '1rem',
              },
            }}
          >
            <Tab label="Overview" icon={<DataUsageIcon />} iconPosition="start" />
            <Tab label="User Statistics" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Admin Privileges" icon={<SecurityIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Admin Overview */}
          <AdminStatsOverview stats={adminStats} />

          {/* Personal Account Section for Admin */}
          <AdminPersonalAccount
            subscription={dashboardData.currentSubscription}
            recentPaymentsCount={dashboardData.recentPayments.length}
            pendingInvoicesCount={dashboardData.pendingInvoices.length}
            usagePercentage={getUsagePercentage()}
          />

          {/* Charts Section */}
          <DashboardCharts
            usageHistory={dashboardData.usageHistory}
            userStatusData={userStatusData}
          />
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
            <Grid item xs={12}>
              <CustomCard>
                <CardContent sx={{ p: 4 }}>
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
                        borderRadius: '12px',
                        background: 'rgba(102, 126, 234, 0.1)',
                        border: '1px solid rgba(102, 126, 234, 0.2)',
                      }}
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
                        borderRadius: '12px',
                        background: 'rgba(0, 212, 170, 0.1)',
                        border: '1px solid rgba(0, 212, 170, 0.2)',
                      }}
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
                        borderRadius: '12px',
                        background: 'rgba(255, 184, 0, 0.1)',
                        border: '1px solid rgba(255, 184, 0, 0.2)',
                      }}
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            mb: 1,
          }}
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
          sx={{ mb: 4, borderRadius: 2 }}
        >
          Your current subscription payment is pending. Services may be limited.
        </Alert>
      )}

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<DataUsageIcon />}
            title="Data Usage"
            value={`${getUsagePercentage().toFixed(1)}%`}
            subtitle="of current plan"
            color="#667eea"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaymentIcon />}
            title="Recent Payments"
            value={dashboardData.recentPayments.length}
            subtitle="this month"
            color="#00d4aa"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ReceiptIcon />}
            title="Pending Invoices"
            value={dashboardData.pendingInvoices.length}
            subtitle="require attention"
            color="#ffb800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<WifiIcon />}
            title="Connection"
            value="Active"
            subtitle="stable connection"
            color="#74b9ff"
          />
        </Grid>
      </Grid>

      {/* Current Subscription Card */}
      <CustomCard className="mb-8">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Current Subscription
          </Typography>

          {dashboardData.currentSubscription ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
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
                      borderRadius: 6,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        borderRadius: 6,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {getUsagePercentage().toFixed(1)}% used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
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
                        sx={{ borderRadius: 2 }}
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
                sx={{
                  background: '#FFD700',
                  color: '#000000',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: '#E6C200',
                  }
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
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Weekly Usage Trend
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboardData.usageHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="day" stroke="#b8c5d6" />
              <YAxis stroke="#b8c5d6" />
              <Bar
                dataKey="usage"
                fill="url(#colorGradient)"
                radius={[4, 4, 0, 0]}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFD700" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#B28F00" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
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