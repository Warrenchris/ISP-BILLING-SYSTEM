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

const Dashboard = () => {
  const { user } = useAuth();
  const { subscriptionsApi, paymentsApi, invoicesApi, adminApi } = useApi();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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

  // COMPONENT DEFINITIONS - MOVED TO TOP TO AVOID HOISTING ISSUES

  // Modern Glass Card Component
  const GlassCard = ({ children, sx = {}, ...props }) => (
    <Card
      sx={{
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );

  // Modern Stat Card Component
  const StatCard = ({ icon, title, value, subtitle, color = '#667eea', trend }) => (
    <GlassCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar
            sx={{
              bgcolor: color,
              mr: 2,
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
              boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
            }}
          >
            {icon}
          </Avatar>
          <Box flex={1}>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ fontWeight: 500, mb: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
        {(subtitle || trend) && (
          <Box display="flex" alignItems="center" justifyContent="space-between">
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box display="flex" alignItems="center">
                <TrendingUpIcon
                  sx={{
                    fontSize: 16,
                    color: trend > 0 ? '#00d4aa' : '#ff6b6b',
                    mr: 0.5,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{
                    color: trend > 0 ? '#00d4aa' : '#ff6b6b',
                    fontWeight: 500,
                  }}
                >
                  {trend > 0 ? '+' : ''}{trend}%
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </GlassCard>
  );

  const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
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

  // CHART DATA

  const pieData = [
    { name: 'Used', value: getUsagePercentage(), color: '#667eea' },
    { name: 'Remaining', value: 100 - getUsagePercentage(), color: alpha('#667eea', 0.2) },
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
          <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<PeopleIcon />}
                title="Total Users"
                value={adminStats.totalUsers}
                subtitle={`${adminStats.activeUsers} active`}
                color="#667eea"
                trend={12}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<CheckCircleIcon />}
                title="Active Users"
                value={adminStats.activeUsers}
                subtitle={`${adminStats.totalUsers > 0 ? ((adminStats.activeUsers / adminStats.totalUsers) * 100).toFixed(1) : 0}% of total`}
                color="#00d4aa"
                trend={8}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<SubscriptionsIcon />}
                title="Active Subscriptions"
                value={adminStats.activeSubscriptions}
                subtitle={`${adminStats.pendingSubscriptions} pending`}
                color="#74b9ff"
                trend={5}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                icon={<MoneyIcon />}
                title="Total Revenue"
                value={`KSh ${adminStats.totalRevenue.toLocaleString()}`}
                subtitle="All completed payments"
                color="#ffb800"
                trend={15}
              />
            </Grid>
          </Grid>

          {/* Personal Account Section for Admin */}
          <GlassCard sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Your Personal Account
              </Typography>
              <Divider sx={{ mb: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '12px',
                      background: 'rgba(116, 185, 255, 0.1)',
                      border: '1px solid rgba(116, 185, 255, 0.2)',
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ bgcolor: '#74b9ff', mr: 2, width: 40, height: 40 }}>
                        <DataUsageIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Current Plan
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {dashboardData.currentSubscription?.DataPlan?.name || 'No Plan'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '12px',
                      background: 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid rgba(0, 212, 170, 0.2)',
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ bgcolor: '#00d4aa', mr: 2, width: 40, height: 40 }}>
                        <SpeedIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Data Usage
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {getUsagePercentage().toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '12px',
                      background: 'rgba(255, 184, 0, 0.1)',
                      border: '1px solid rgba(255, 184, 0, 0.2)',
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ bgcolor: '#ffb800', mr: 2, width: 40, height: 40 }}>
                        <PaymentIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Recent Payments
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {dashboardData.recentPayments.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: '12px',
                      background: 'rgba(255, 107, 107, 0.1)',
                      border: '1px solid rgba(255, 107, 107, 0.2)',
                    }}
                  >
                    <Box display="flex" alignItems="center" mb={2}>
                      <Avatar sx={{ bgcolor: '#ff6b6b', mr: 2, width: 40, height: 40 }}>
                        <ReceiptIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2">
                          Pending Invoices
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {dashboardData.pendingInvoices.length}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>

          {/* Charts Section */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <GlassCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    User Growth Trend
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboardData.usageHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                      <XAxis dataKey="day" stroke="#b8c5d6" />
                      <YAxis stroke="#b8c5d6" />
                      <Line
                        type="monotone"
                        dataKey="usage"
                        stroke="#667eea"
                        strokeWidth={3}
                        dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </GlassCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <GlassCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    User Status Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={userStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {userStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <Box mt={2}>
                    {userStatusData.map((item, index) => (
                      <Box key={index} display="flex" alignItems="center" mb={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: item.color,
                            mr: 1,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {item.name}: {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* User Statistics */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <GlassCard>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                    Recent Users
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>User</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Role</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {adminStats.recentUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <Box display="flex" alignItems="center">
                                <Avatar sx={{ mr: 2, bgcolor: '#667eea' }}>
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight={500}>
                                    {user.firstName} {user.lastName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ID: {user.id}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{user.email}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.status}
                                size="small"
                                color={
                                  user.status === 'active' ? 'success' :
                                  user.status === 'inactive' ? 'warning' : 'error'
                                }
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.role}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 500 }}
                              />
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                <Tooltip title="View Details">
                                  <IconButton size="small" color="primary">
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit User">
                                  <IconButton size="small" color="primary">
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                {user.status === 'active' ? (
                                  <Tooltip title="Suspend User">
                                    <IconButton
                                      size="small"
                                      color="warning"
                                      onClick={() => handleUserAction(user.id, 'suspend')}
                                    >
                                      <BlockIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Activate User">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleUserAction(user.id, 'activate')}
                                    >
                                      <ActivateIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </GlassCard>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Admin Privileges */}
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <GlassCard>
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
              </GlassCard>
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
      <GlassCard sx={{ mb: 4 }}>
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
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                View Plans
              </Button>
            </Box>
          )}
        </CardContent>
      </GlassCard>

      {/* Usage Chart */}
      <GlassCard>
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
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#764ba2" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </GlassCard>
    </Box>
  );
};

export default Dashboard;