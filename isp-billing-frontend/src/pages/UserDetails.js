import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Paper, Divider,
    Chip, Button, IconButton, Tabs, Tab,
    LinearProgress, Alert, Menu, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Snackbar, Tooltip
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    Router as RouterIcon,
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
    Key as KeyIcon,
    Speed as SpeedIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import { useApi } from '../contexts/ApiContext';

const UserDetails = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { adminApi, subscriptionsApi, vouchersApi } = useApi();

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

    const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
    const [selectedVoucherPlan, setSelectedVoucherPlan] = useState('');
    const [plans, setPlans] = useState([]);

    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
                                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                    {displayName}
                                </Typography>
                                <Chip
                                    icon={isOnline ? <OnlineIcon style={{ color: '#fff' }} /> : <WifiIcon />}
                                    label={isOnline ? 'Currently Online' : (user.status || 'Offline')}
                                    color={isOnline ? 'success' : (user.status === 'active' ? 'primary' : 'default')}
                                    size="small"
                                    sx={{ fontWeight: 700, px: 0.5 }}
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
                            onClick={() => setVoucherDialogOpen(true)}
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
                            fontWeight: 700,
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
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
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
                                        sx={{ fontWeight: 700, mt: 0.5 }}
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

            {/* Placeholder for future tabs (Group 2, 3, 4) */}
            {currentTab !== 'general-information' && (
                <Paper sx={{ p: 4, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="h6" color="text.secondary">
                        {currentTab.toUpperCase()} tab view is being assembled.
                    </Typography>
                </Paper>
            )}

            {/* Change Expiry Modal */}
            <Dialog open={expiryDialogOpen} onClose={() => setExpiryDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontWeight: 700 }}>Change Expiry Date</DialogTitle>
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
