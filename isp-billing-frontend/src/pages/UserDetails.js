import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Paper, Divider,
    List, ListItem, ListItemText, Chip, Button, IconButton,
    Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
    LinearProgress, Alert, Skeleton
} from '@mui/material';
import {
    ArrowBack as ArrowBackIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon,
    Router as RouterIcon,
    History as HistoryIcon,
    Receipt as ReceiptIcon,
    CreditCard as CreditCardIcon,
    ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const UserDetails = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const { adminApi, paymentsApi, api } = useApi();

    const [user, setUser] = useState(null);
    const [payments, setPayments] = useState([]);
    const [usageData, setUsageData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [usageLoading, setUsageLoading] = useState(true);
    const [usageError, setUsageError] = useState(null);

    const fetchUsageHistory = useCallback(async () => {
        if (!id) return;
        try {
            setUsageLoading(true);
            setUsageError(null);
            const res = await api.get(`/users/${id}/usage-history`, { params: { period: '7d' } });
            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            setUsageData(rows);
        } catch (e) {
            setUsageError(e.response?.data?.message || 'Could not load usage history');
            setUsageData([]);
        } finally {
            setUsageLoading(false);
        }
    }, [api, id]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!id) return;
            setLoading(true);
            setError(null);
            try {
                const [userRes, paymentsRes] = await Promise.allSettled([
                    adminApi.users.getById(id),
                    paymentsApi.getPaymentHistory({ userId: id, limit: 5 }),
                ]);

                if (userRes.status === 'fulfilled') {
                    setUser(userRes.value.data?.data || userRes.value.data);
                } else {
                    throw new Error('Failed to load user details');
                }

                if (paymentsRes.status === 'fulfilled') {
                    const payData = paymentsRes.value.data?.data || paymentsRes.value.data || [];
                    setPayments(Array.isArray(payData) ? payData : (payData.items || []));
                }

            } catch (err) {
                console.error('Error fetching details:', err);
                setError('Could not load user details.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [id, adminApi.users, paymentsApi]);

    useEffect(() => {
        fetchUsageHistory();
    }, [fetchUsageHistory]);

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

    const usageHasActivity = usageData.some(
        (row) => (Number(row.download) || 0) + (Number(row.upload) || 0) > 0
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" alignItems="center" gap={2} mb={4}>
                <IconButton onClick={() => navigate('/users')} sx={{ border: `1px solid ${theme.palette.divider}` }}>
                    <ArrowBackIcon />
                </IconButton>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700 }}>
                        {user.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body1" color="text.secondary">ID: {user.id}</Typography>
                        <Chip
                            label={user.status || 'Active'}
                            color={user.status === 'Suspended' ? 'error' : 'success'}
                            size="small"
                        />
                    </Box>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Left Column: User Info & Subscription */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Paper sx={{ p: 0, overflow: 'hidden',  mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <Box sx={{ p: 3, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.1)} 100%)` }}>
                            <Box display="flex" justifyContent="center" mb={2}>
                                <Box sx={{
                                    width: 80, height: 80,
                                    bgcolor: theme.palette.primary.main, color: 'primary.contrastText',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <PersonIcon sx={{ fontSize: 40 }} />
                                </Box>
                            </Box>
                            <Typography variant="h5" align="center" fontWeight="bold">{user.name}</Typography>
                            <Typography variant="body2" align="center" color="text.secondary">
                                {user.subscription?.plan?.name || user.plan || 'No Active Plan'}
                            </Typography>
                        </Box>
                        <List>
                            <ListItem>
                                <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                <ListItemText primary="Email" secondary={user.email} />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                                <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                <ListItemText primary="Phone" secondary={user.phone} />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                                <LocationIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                <ListItemText primary="Address" secondary={user.address || 'N/A'} />
                            </ListItem>
                            <Divider component="li" />
                            <ListItem>
                                <RouterIcon sx={{ mr: 2, color: 'text.secondary' }} />
                                <ListItemText primary="IP Address" secondary={user.ip || 'Assigning...'} />
                            </ListItem>
                        </List>
                    </Paper>

                    <Paper sx={{ p: 3,  border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" gutterBottom>Current Subscription</Typography>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography color="text.secondary">Plan</Typography>
                            <Typography fontWeight="bold">{user.subscription?.plan?.name || user.plan || 'None'}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography color="text.secondary">Price</Typography>
                            <Typography fontWeight="bold">
                                {formatCurrency(user.subscription?.plan?.price ?? user.price ?? 0)}/mo
                            </Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography color="text.secondary">Renewal Date</Typography>
                            <Typography fontWeight="bold">
                                {user.subscription?.endDate ? new Date(user.subscription.endDate).toLocaleDateString() : 'N/A'}
                            </Typography>
                        </Box>
                        <Button fullWidth variant="outlined" color="primary" sx={{ }}>
                            Manage Subscription
                        </Button>
                    </Paper>
                </Grid>

                {/* Right Column: Usage & Payments */}
                <Grid size={{ xs: 12, md: 8 }}>
                    {/* Usage Chart */}
                    <Paper sx={{ p: 3,  mb: 3, border: `1px solid ${theme.palette.divider}` }}>
                        <Typography variant="h6" gutterBottom>Data Usage Summary (Last 7 Days)</Typography>
                        <Box height={300}>
                            {usageLoading ? (
                                <Skeleton variant="rounded" height="100%" width="100%" />
                            ) : usageError ? (
                                <ErrorState message={usageError} onRetry={fetchUsageHistory} />
                            ) : !usageHasActivity ? (
                                <EmptyState
                                    icon={<ShowChartIcon />}
                                    title="No usage recorded"
                                    subtitle="This user has no aggregated upload or download in the selected window."
                                    action={{ label: 'Retry', onClick: fetchUsageHistory }}
                                />
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={usageData}>
                                        <XAxis dataKey="label" stroke={theme.palette.text.secondary} />
                                        <YAxis tickFormatter={(v) => `${v} MB`} stroke={theme.palette.text.secondary} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: theme.palette.background.paper }}
                                            formatter={(value, name) => [`${value} MB`, name]}
                                        />
                                        <Line type="monotone" dataKey="download" stroke={theme.palette.primary.main} strokeWidth={3} dot={{ r: 4 }} name="Download (MB)" />
                                        <Line type="monotone" dataKey="upload" stroke={theme.palette.secondary.main} strokeWidth={3} dot={{ r: 4 }} name="Upload (MB)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </Box>
                    </Paper>

                    {/* Payment History */}
                    <Paper sx={{ p: 3,  border: `1px solid ${theme.palette.divider}` }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">Payment & Invoice History</Typography>
                            <Button startIcon={<HistoryIcon />}>View All</Button>
                        </Box>
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Invoice ID</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Amount</TableCell>
                                        <TableCell>Method</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center">No payment history</TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map((payment) => (
                                            <TableRow key={payment.id}>
                                                <TableCell>{payment.invoiceId || payment.id}</TableCell>
                                                <TableCell>{new Date(payment.date || payment.createdAt).toLocaleDateString()}</TableCell>
                                                <TableCell>{payment.amount}</TableCell>
                                                <TableCell>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        {payment.method === 'M-Pesa' ? <PhoneIcon fontSize="small" /> : <CreditCardIcon fontSize="small" />}
                                                        {payment.method}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip label={payment.status} color={payment.status === 'Paid' ? 'success' : 'warning'} size="small" variant="outlined" />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small"><ReceiptIcon /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default UserDetails;
