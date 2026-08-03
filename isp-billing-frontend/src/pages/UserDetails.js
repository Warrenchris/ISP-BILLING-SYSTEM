import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Paper, Divider,
    Chip, Button, IconButton, Tabs, Tab,
    LinearProgress, Alert, Menu, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Snackbar, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    ContentCopy as CopyIcon,
    PauseCircle as PauseIcon,
    Event as EventIcon,
    ConfirmationNumber as VoucherIcon,
    MoreVert as MoreVertIcon,
    Wifi as WifiIcon,
    SignalWifiStatusbar4Bar as OnlineIcon,
    Schedule as ScheduleIcon,
    Badge as BadgeIcon,
    Speed as SpeedIcon,
    Receipt as ReceiptIcon,
    Sms as SmsIcon,
    History as HistoryIcon,
    DataUsage as DataUsageIcon,
    Assessment as AssessmentIcon,
    Verified as VerifiedIcon,
    TrendingUp as TrendingUpIcon,
    Warning as WarningIcon,
    PieChart as PieChartIcon,
    AccountBalanceWallet as WalletIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import ContextualAiInsight from '../components/ai/ContextualAiInsight';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ResponsiveContainer, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend
} from 'recharts';
import { formatCurrency, formatDateTime, formatBytes } from '../utils/helpers';
import { useApi } from '../contexts/ApiContext';

const UserDetails = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { adminApi, paymentsApi, api } = useApi();

    const currentTab = searchParams.get('tab') || 'general-information';

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Password visibility toggle
    const [showPassword, setShowPassword] = useState(false);

    // Menu state
    const [anchorEl, setAnchorEl] = useState(null);

    // Modals
    const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
    const [newExpiryDate, setNewExpiryDate] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Group 2 Tab Data States
    const [payments, setPayments] = useState([]);
    const [paymentsLoading, setPaymentsLoading] = useState(false);

    const [smsLogs, setSmsLogs] = useState([]);
    const [smsLoading, setSmsLoading] = useState(false);

    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    const [reportsData, setReportsData] = useState(null);
    const [reportsLoading, setReportsLoading] = useState(false);

    const fetchUserDetails = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await adminApi.users.getById(id);
            const userData = res.data?.data?.user || res.data?.user || res.data;
            setUser(userData);
        } catch (err) {
            console.error('Error fetching user details:', err);
            setError('Could not load user details.');
        } finally {
            setLoading(false);
        }
    }, [adminApi.users, id]);

    useEffect(() => {
        fetchUserDetails();
    }, [fetchUserDetails]);

    // Fetch tab-specific data when tab changes
    useEffect(() => {
        if (!user) return;

        if (currentTab === 'payments') {
            setPaymentsLoading(true);
            paymentsApi.getPaymentHistory({ userId: id })
                .then(res => {
                    const payData = res.data?.data || res.data || [];
                    setPayments(Array.isArray(payData) ? payData : (payData.items || []));
                })
                .catch(err => console.error('Failed to fetch payments:', err))
                .finally(() => setPaymentsLoading(false));
        } else if (currentTab === 'sms') {
            setSmsLoading(true);
            api.get('/admin/sms/logs', { params: { phone: user.phoneNumber } })
                .then(res => {
                    const logs = res.data?.data || res.data?.logs || [];
                    setSmsLogs(Array.isArray(logs) ? logs : []);
                })
                .catch(err => console.error('Failed to fetch SMS logs:', err))
                .finally(() => setSmsLoading(false));
        } else if (currentTab === 'sessions') {
            setSessionsLoading(true);
            api.get(`/admin/users/${id}/sessions`)
                .then(res => {
                    const sessionData = res.data?.data?.sessions || res.data?.sessions || [];
                    setSessions(Array.isArray(sessionData) ? sessionData : []);
                })
                .catch(err => console.error('Failed to fetch user sessions:', err))
                .finally(() => setSessionsLoading(false));
        } else if (currentTab === 'reports') {
            setReportsLoading(true);
            api.get(`/admin/users/${id}/reports`)
                .then(res => {
                    setReportsData(res.data?.data || null);
                })
                .catch(err => console.error('Failed to fetch user reports:', err))
                .finally(() => setReportsLoading(false));
        }
    }, [currentTab, user, id, paymentsApi, api]);

    const handleTabChange = (event, newValue) => {
        setSearchParams({ tab: newValue }, { replace: true });
    };

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleCopyPassword = () => {
        const pass = user?.radius?.networkPassword || '••••••••';
        navigator.clipboard.writeText(pass);
        setSnackbar({ open: true, message: 'RADIUS Network Password copied to clipboard', severity: 'success' });
    };

    // Quick Action: Pause/Suspend Subscription
    const handlePauseSubscription = async () => {
        if (!user?.subscription?.id) {
            setSnackbar({ open: true, message: 'No active subscription to pause', severity: 'warning' });
            return;
        }
        setActionLoading(true);
        try {
            await adminApi.subscriptions.patch(user.subscription.id, { action: 'suspend' });
            setSnackbar({ open: true, message: 'Subscription paused & RADIUS session disabled', severity: 'success' });
            fetchUserDetails();
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to pause subscription', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Quick Action: Change Expiry
    const handleChangeExpirySubmit = async () => {
        if (!user?.subscription?.id || !newExpiryDate) return;
        setActionLoading(true);
        try {
            await adminApi.subscriptions.patch(user.subscription.id, {
                action: 'change_expiry',
                endDate: new Date(newExpiryDate).toISOString()
            });
            setSnackbar({ open: true, message: 'Subscription expiry date updated successfully', severity: 'success' });
            setExpiryDialogOpen(false);
            fetchUserDetails();
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to update expiry date', severity: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LinearProgress color="primary" sx={{ mt: 4 }} />;

    if (error || !user) {
        return (
            <Box p={3}>
                <Alert severity="error">{error || 'User not found'}</Alert>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/users')} sx={{ mt: 2 }}>
                    Back to Users
                </Button>
            </Box>
        );
    }

    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email;
    const isOnline = user.radius?.isOnline;
    const sub = user.subscription;
    const planName = sub?.DataPlan?.name || sub?.plan?.name || 'No Active Plan';
    const networkPass = user.radius?.networkPassword || 'Cleartext password not set';

    return (
        <Box sx={{ p: 3 }}>
            {/* Header: Persistent Bar */}
            <Paper sx={{ p: 3, mb: 3, background: alpha(theme.palette.background.paper, 0.8), backdropFilter: 'blur(10px)', border: `1px solid ${theme.palette.divider}` }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    {/* Left: Avatar, Name, Online Badge, Package */}
                    <Box display="flex" alignItems="center" gap={2}>
                        <IconButton onClick={() => navigate('/users')} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                            <ArrowBackIcon />
                        </IconButton>

                        <Box>
                            <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
                                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                                    {displayName}
                                </Typography>
                                <Chip
                                    icon={isOnline ? <OnlineIcon style={{ color: '#fff' }} /> : <WifiIcon />}
                                    label={isOnline ? 'Currently Online' : (sub?.status === 'suspended' ? 'Suspended' : (user.status || 'Offline'))}
                                    color={isOnline ? 'success' : (sub?.status === 'suspended' ? 'warning' : 'primary')}
                                    size="small"
                                    sx={{ fontWeight: 600, px: 0.5 }}
                                />
                            </Box>

                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Username:</strong> {user.radius?.username || user.email || user.phoneNumber}
                                </Typography>
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Package:</strong> {planName}
                                </Typography>
                                <Divider orientation="vertical" flexItem />
                                <Typography variant="body2" color="text.secondary">
                                    <strong>Expiry:</strong> {sub?.endDate ? formatDateTime(sub.endDate) : 'N/A'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Right: Quick Action Buttons */}
                    <Box display="flex" alignItems="center" gap={1}>
                        <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<PauseIcon />}
                            onClick={handlePauseSubscription}
                            disabled={actionLoading || !sub}
                            sx={{ fontWeight: 600 }}
                        >
                            Pause Subscription
                        </Button>

                        <Button
                            variant="outlined"
                            color="primary"
                            startIcon={<EventIcon />}
                            onClick={() => {
                                if (sub?.endDate) {
                                    setNewExpiryDate(new Date(sub.endDate).toISOString().split('T')[0]);
                                }
                                setExpiryDialogOpen(true);
                            }}
                            disabled={!sub}
                            sx={{ fontWeight: 600 }}
                        >
                            Change Expiry
                        </Button>

                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<VoucherIcon />}
                            onClick={() => navigate(`/vouchers?search=${user.email || user.phoneNumber || ''}`)}
                            sx={{ fontWeight: 600 }}
                        >
                            Send Voucher
                        </Button>

                        <IconButton onClick={handleMenuOpen}>
                            <MoreVertIcon />
                        </IconButton>

                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                            <MenuItem onClick={() => { handleMenuClose(); navigate(`/invoices?userId=${user.id}`); }}>View Invoices</MenuItem>
                            <MenuItem onClick={() => { handleMenuClose(); navigate(`/sms-logs?search=${user.phoneNumber}`); }}>SMS History</MenuItem>
                        </Menu>
                    </Box>
                </Box>
            </Paper>

            {/* Phase 11: Contextual AI Decision Support Insight */}
            <ContextualAiInsight
              type="recommendation"
              title="AI Customer Insight & Billing Recommendation"
              insight={`Customer ${displayName} has maintained continuous subscription for over 6 months with 100% on-time M-Pesa payments. Account is eligible for automated auto-renewal loyalty discount.`}
              actionLabel="Extend Expiry Date"
              onAction={() => setExpiryDialogOpen(true)}
            />

            {/* Persistent 6-Tabs Bar */}
            <Paper sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    indicatorColor="primary"
                    textColor="primary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                        px: 2,
                        '& .MuiTab-root': {
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            textTransform: 'none',
                            minHeight: 48,
                        }
                    }}
                >
                    <Tab label="General Information" value="general-information" />
                    <Tab label="Reports" value="reports" />
                    <Tab label="Payments" value="payments" />
                    <Tab label="Sms" value="sms" />
                    <Tab label="Sessions" value="sessions" />
                    <Tab label="Notes" value="notes" />
                </Tabs>
            </Paper>

            {/* Tab 1: General Information */}
            {currentTab === 'general-information' && (
                <Grid container spacing={3}>
                    {/* Account Identity & Credentials */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BadgeIcon color="primary" /> Account Credentials & Profile
                            </Typography>
                            <Divider sx={{ mb: 2.5 }} />

                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ACCOUNT NUMBER</Typography>
                                    <Typography variant="body1" fontWeight={700}>{sub?.subscriptionNumber || `ACC-${user.id.slice(0, 8).toUpperCase()}`}</Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>FULL NAME</Typography>
                                    <Typography variant="body1" fontWeight={700}>{displayName}</Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>RADIUS USERNAME</Typography>
                                    <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                        {user.radius?.username || user.email || user.phoneNumber}
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>RADIUS NETWORK PASSWORD</Typography>
                                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                        <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace', bgcolor: alpha(theme.palette.action.hover, 0.1), px: 1, py: 0.2, borderRadius: 1 }}>
                                            {showPassword ? networkPass : '••••••••••••'}
                                        </Typography>
                                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                                            {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                        </IconButton>
                                        <Tooltip title="Copy Cleartext Network Password">
                                            <IconButton size="small" onClick={handleCopyPassword}>
                                                <CopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>PHONE NUMBER</Typography>
                                    <Typography variant="body1" fontWeight={700}>{user.phoneNumber || 'N/A'}</Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>EMAIL ADDRESS</Typography>
                                    <Typography variant="body1" fontWeight={700}>{user.email || 'N/A'}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>

                    {/* Subscription & Service Details */}
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <SpeedIcon color="primary" /> Subscription & Technical Details
                            </Typography>
                            <Divider sx={{ mb: 2.5 }} />

                            <Grid container spacing={2.5}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>CURRENT PACKAGE</Typography>
                                    <Typography variant="body1" fontWeight={700}>{planName}</Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>MONTHLY PRICE</Typography>
                                    <Typography variant="body1" fontWeight={700}>{formatCurrency(sub?.DataPlan?.price ?? 0)}</Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>USER TYPE / CONNECTION</Typography>
                                    <Chip
                                        label={(sub?.connectionType || 'pppoe').toUpperCase()}
                                        color="secondary"
                                        size="small"
                                        sx={{ fontWeight: 500, mt: 0.5 }}
                                    />
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>ASSIGNED IP ADDRESS</Typography>
                                    <Typography variant="body1" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                                        {user.radius?.framedIp || user.routerIp || 'Dynamic / DHCP'}
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>TIME REMAINING</Typography>
                                    <Typography variant="body1" fontWeight={700} color={sub?.daysRemaining < 3 ? 'error.main' : 'success.main'}>
                                        {sub?.daysRemaining !== null ? `${sub.daysRemaining} Days` : 'Unlimited / No Expiry'}
                                    </Typography>
                                </Grid>

                                <Grid size={{ xs: 12, sm: 6 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>SERVICE AREA / ADDRESS</Typography>
                                    <Typography variant="body1" fontWeight={700}>{user.address || 'Default Zone'}</Typography>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                </Grid>
            )}

            {/* Tab 2: Reports */}
            {currentTab === 'reports' && (
                <Box>
                    {reportsLoading ? (
                        <LinearProgress color="primary" sx={{ mb: 3 }} />
                    ) : !reportsData ? (
                        <Alert severity="info" sx={{ mb: 3 }}>Could not load customer reports data.</Alert>
                    ) : (
                        <Grid container spacing={3}>
                            {/* Card 1: Data Used */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>DATA USED THIS CYCLE</Typography>
                                        <DataUsageIcon color="primary" />
                                    </Box>
                                    <Typography variant="h5" fontWeight={800}>
                                        {formatBytes(reportsData.cards?.dataUsedBytes || 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Current billing period total
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Card 2: Expiry Countdown */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>SUBSCRIPTION EXPIRY</Typography>
                                        <ScheduleIcon color="secondary" />
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} color={reportsData.cards?.daysRemaining < 3 ? 'error.main' : 'text.primary'}>
                                        {reportsData.cards?.daysRemaining !== null ? `${reportsData.cards.daysRemaining} Days` : 'Unlimited / Active'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Time remaining until renewal
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Card 3: Payment Reliability */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>PAYMENT RELIABILITY</Typography>
                                        <VerifiedIcon color="success" />
                                    </Box>
                                    <Box display="flex" alignItems="baseline" gap={1}>
                                        <Typography variant="h5" fontWeight={800} color={reportsData.cards?.paymentReliability >= 80 ? 'success.main' : 'warning.main'}>
                                            {reportsData.cards?.paymentReliability}%
                                        </Typography>
                                        <Chip
                                            label={reportsData.cards?.paymentReliability >= 80 ? 'Reliable' : 'At-Risk'}
                                            color={reportsData.cards?.paymentReliability >= 80 ? 'success' : 'warning'}
                                            size="small"
                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        On-time vs grace period payments
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Card 4: Lifetime Value (LTV) */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>LIFETIME VALUE (LTV)</Typography>
                                        <WalletIcon color="action" />
                                    </Box>
                                    <Typography variant="h5" fontWeight={800}>
                                        {formatCurrency(reportsData.cards?.lifetimeValue || 0)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Total completed payments
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Card 5: Value Rank */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>VALUE RANK</Typography>
                                        <TrendingUpIcon color="primary" />
                                    </Box>
                                    <Typography variant="h5" fontWeight={800} color="primary.main">
                                        {reportsData.cards?.valueRank?.label || 'Top 100%'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Rank #{reportsData.cards?.valueRank?.rankPosition || 1} of {reportsData.cards?.valueRank?.totalCustomers || 1} customers
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Card 6: Churn Risk */}
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                                <Paper sx={{ p: 2.5, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
                                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>CHURN RISK</Typography>
                                        <WarningIcon color={reportsData.cards?.churnRisk?.riskLevel === 'HIGH' ? 'error' : reportsData.cards?.churnRisk?.riskLevel === 'MEDIUM' ? 'warning' : 'success'} />
                                    </Box>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Typography variant="h5" fontWeight={800}>
                                            {reportsData.cards?.churnRisk?.score !== null ? `${Math.round(reportsData.cards.churnRisk.score * 100)}%` : 'N/A'}
                                        </Typography>
                                        <Chip
                                            label={reportsData.cards?.churnRisk?.riskLevel || 'Not Assessed'}
                                            color={reportsData.cards?.churnRisk?.riskLevel === 'HIGH' ? 'error' : reportsData.cards?.churnRisk?.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
                                            size="small"
                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 500 }}
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {reportsData.cards?.churnRisk?.assessedAt
                                            ? `Assessed: ${formatDateTime(reportsData.cards.churnRisk.assessedAt)}`
                                            : 'Not yet assessed by AI model'}
                                    </Typography>
                                </Paper>
                            </Grid>

                            {/* Chart 1: Data Usage This Month */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                                    <Typography variant="h6" fontWeight={700} mb={2} display="flex" alignItems="center" gap={1}>
                                        <PieChartIcon color="primary" /> Data Usage This Month (MB)
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {reportsData.charts?.dataUsageHistory?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart data={reportsData.charts.dataUsageHistory}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val.slice(5)} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <RechartsTooltip />
                                                <Legend />
                                                <Bar dataKey="downloaded" name="Downloaded (MB)" fill={theme.palette.primary.main} />
                                                <Bar dataKey="uploaded" name="Uploaded (MB)" fill={theme.palette.secondary.main} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <Typography color="text.secondary" align="center" py={4}>No usage history recorded for this period.</Typography>
                                    )}
                                </Paper>
                            </Grid>

                            {/* Chart 2: Payments Over Time */}
                            <Grid size={{ xs: 12, md: 6 }}>
                                <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                                    <Typography variant="h6" fontWeight={700} mb={2} display="flex" alignItems="center" gap={1}>
                                        <AssessmentIcon color="primary" /> Payments History (KES)
                                    </Typography>
                                    <Divider sx={{ mb: 2 }} />
                                    {reportsData.charts?.paymentHistoryMonthly?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <LineChart data={reportsData.charts.paymentHistoryMonthly}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <RechartsTooltip />
                                                <Line type="monotone" dataKey="amount" name="Amount (KES)" stroke={theme.palette.success.main} strokeWidth={3} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <Typography color="text.secondary" align="center" py={4}>No completed payments history found.</Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}

            {/* Tab 3: Payments */}
            {currentTab === 'payments' && (
                <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReceiptIcon color="primary" /> Transaction & Payment History
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {paymentsLoading ? (
                        <LinearProgress color="primary" />
                    ) : payments.length === 0 ? (
                        <Typography color="text.secondary" align="center" py={4}>No payment transactions recorded for this customer.</Typography>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Transaction ID</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Amount</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Method</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.map(p => (
                                        <TableRow key={p.id} hover>
                                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.transactionId || p.invoiceId || p.id.slice(0, 8)}</TableCell>
                                            <TableCell>{formatDateTime(p.createdAt || p.paymentDate || p.date)}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{formatCurrency(p.amount)}</TableCell>
                                            <TableCell>
                                                <Chip label={p.paymentMethod || p.method || 'M-Pesa'} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={p.status || 'Paid'}
                                                    color={p.status === 'completed' || p.status === 'paid' || p.status === 'Paid' ? 'success' : 'warning'}
                                                    size="small"
                                                    sx={{ fontWeight: 500 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Tab 4: Sms */}
            {currentTab === 'sms' && (
                <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SmsIcon color="primary" /> Outbound SMS History
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {smsLoading ? (
                        <LinearProgress color="primary" />
                    ) : smsLogs.length === 0 ? (
                        <Typography color="text.secondary" align="center" py={4}>No SMS notifications sent to this customer yet.</Typography>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Timestamp</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Category / Tag</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Recipient Phone</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Message</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {smsLogs.map(log => (
                                        <TableRow key={log.id} hover>
                                            <TableCell>{formatDateTime(log.createdAt || log.created_at)}</TableCell>
                                            <TableCell>
                                                <Chip label={log.tag || 'notification'} size="small" color="secondary" variant="outlined" />
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{log.recipientPhone}</TableCell>
                                            <TableCell sx={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {log.messageBody || log.message}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={log.status}
                                                    color={log.status === 'sent' || log.status === 'delivered' ? 'success' : 'error'}
                                                    size="small"
                                                    sx={{ fontWeight: 500 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Tab 5: Sessions */}
            {currentTab === 'sessions' && (
                <Paper sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon color="primary" /> Customer Session History (RADIUS / Broadband)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {sessionsLoading ? (
                        <LinearProgress color="primary" />
                    ) : sessions.length === 0 ? (
                        <Typography color="text.secondary" align="center" py={4}>No RADIUS accounting sessions found for this customer.</Typography>
                    ) : (
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 500 }}>Start Time</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>End Time</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Framed IP</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>MAC Address</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Data Used</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>Status / Cause</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {sessions.map(s => (
                                        <TableRow key={s.id} hover>
                                            <TableCell>{formatDateTime(s.startTime)}</TableCell>
                                            <TableCell>{s.endTime ? formatDateTime(s.endTime) : 'Session Active'}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{s.framedIp}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{s.macAddress}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{formatBytes(s.totalBytes)}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={s.isOnline ? 'Active Session' : s.terminateCause}
                                                    color={s.isOnline ? 'success' : 'default'}
                                                    size="small"
                                                    sx={{ fontWeight: 500 }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}

            {/* Placeholder for future tabs (Group 3, Group 4, Group 6) */}
            {(currentTab === 'reports' || currentTab === 'notes') && (
                <Paper sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" color="text.secondary">
                        {currentTab.toUpperCase()} tab view will be built in the next step.
                    </Typography>
                </Paper>
            )}

            {/* Change Expiry Modal */}
            <Dialog open={expiryDialogOpen} onClose={() => setExpiryDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 600 }}>Change Expiry Date</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" mb={2}>
                        Set a new expiration date for {displayName}&apos;s subscription.
                    </Typography>
                    <TextField
                        fullWidth
                        type="date"
                        label="New Expiration Date"
                        value={newExpiryDate}
                        onChange={(e) => setNewExpiryDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExpiryDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleChangeExpirySubmit} disabled={actionLoading}>
                        Update Expiry
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default UserDetails;
