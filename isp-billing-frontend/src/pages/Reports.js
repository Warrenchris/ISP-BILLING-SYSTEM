import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent, Button, MenuItem, TextField, Skeleton
} from '@mui/material';
import {
    TrendingUp, TrendingDown, People, AttachMoney
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const Reports = () => {
    const theme = useTheme();
    const { reportService } = useApi();
    const [period, setPeriod] = useState('monthly');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(null);

    const [revenueData, setRevenueData] = useState(null);
    const [revenueLoading, setRevenueLoading] = useState(true);
    const [revenueError, setRevenueError] = useState(null);

    const [growthData, setGrowthData] = useState(null);
    const [growthLoading, setGrowthLoading] = useState(true);
    const [growthError, setGrowthError] = useState(null);

    const fetchReports = useCallback(async () => {
        setStatsLoading(true);
        setRevenueLoading(true);
        setGrowthLoading(true);
        setStatsError(null);
        setRevenueError(null);
        setGrowthError(null);

        const [summaryRes, revenueRes, growthRes] = await Promise.allSettled([
            reportService.getSummary({ period }),
            reportService.getRevenueChart({ period }),
            reportService.getUserGrowthChart({ period: 'weekly' }),
        ]);

        if (summaryRes.status === 'fulfilled') {
            setStats(summaryRes.value.data?.data ?? null);
            setStatsError(null);
        } else {
            setStats(null);
            setStatsError(summaryRes.reason);
        }

        if (revenueRes.status === 'fulfilled') {
            const data = revenueRes.value.data?.data;
            setRevenueData(Array.isArray(data) ? data : []);
            setRevenueError(null);
        } else {
            setRevenueData([]);
            setRevenueError(revenueRes.reason);
        }

        if (growthRes.status === 'fulfilled') {
            const data = growthRes.value.data?.data;
            setGrowthData(Array.isArray(data) ? data : []);
            setGrowthError(null);
        } else {
            setGrowthData([]);
            setGrowthError(growthRes.reason);
        }

        setStatsLoading(false);
        setRevenueLoading(false);
        setGrowthLoading(false);
    }, [period, reportService]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const StatCard = ({ title, value, change, icon, color }) => (
        <Card sx={{ background: alpha(theme.palette.background.paper, 0.6), height: '100%' }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="700">
                            {value}
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            p: 1.5,
                            bgcolor: alpha(color, 0.1),
                            color: color }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Box display="flex" alignItems="center" mt={2}>
                    {change > 0 ? <TrendingUp color="success" fontSize="small" /> : change < 0 ? <TrendingDown color="error" fontSize="small" /> : null}
                    <Typography
                        variant="body2"
                        color={change > 0 ? 'success.main' : change < 0 ? 'error.main' : 'text.secondary'}
                        sx={{ ml: change === 0 ? 0 : 0.5, fontWeight: 600 }}
                    >
                        {change === 0 ? '—' : `${Math.abs(change)}%`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        vs last {period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day'}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    const periodLabel =
        period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day';

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Financial Reports
                    </Typography>
                    <Typography color="text.secondary">Revenue analysis and key metrics</Typography>
                </Box>
                <Box display="flex" gap={2}>
                    <TextField select value={period} onChange={(e) => setPeriod(e.target.value)} size="small" sx={{ width: 150 }}>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                    </TextField>
                    <Button variant="outlined" sx={{}}>Export PDF</Button>
                </Box>
            </Box>

            {statsLoading ? (
                <Grid container spacing={3} mb={4}>
                    {[1, 2, 3, 4].map((k) => (
                        <Grid key={k} size={{ xs: 12, sm: 6, md: 3 }}>
                            <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
                        </Grid>
                    ))}
                </Grid>
            ) : statsError ? (
                <Box mb={4}>
                    <ErrorState message="Failed to load report summary" onRetry={fetchReports} />
                </Box>
            ) : stats ? (
                <Grid container spacing={3} mb={4}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatCard title="Total Revenue" value={stats.revenueFormatted} change={stats.revenueChange} icon={<AttachMoney />} color={theme.palette.success.main} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatCard title="Active Subscribers" value={stats.activeSubscribers.toLocaleString()} change={stats.subscribersChange} icon={<People />} color={theme.palette.info.main} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatCard title="Avg. Revenue Per User" value={stats.arpuFormatted} change={stats.arpuChange} icon={<TrendingDown />} color={theme.palette.warning.main} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <StatCard title="Churn Rate" value={`${Number(stats.churnRate).toFixed(1)}%`} change={stats.churnChange} icon={<TrendingUp />} color={theme.palette.error.main} />
                    </Grid>
                </Grid>
            ) : null}

            <Grid container spacing={3}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{ p: 3, minHeight: 400, background: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" gutterBottom>Revenue Growth</Typography>
                        {revenueLoading ? (
                            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
                        ) : revenueError ? (
                            <ErrorState message="Failed to load revenue chart" onRetry={fetchReports} />
                        ) : !revenueData || revenueData.length === 0 ? (
                            <EmptyState
                                title="No revenue data"
                                subtitle={`No completed payments in this ${periodLabel} view.`}
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                    <YAxis stroke={theme.palette.text.secondary} />
                                    <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: 'none', boxShadow: theme.shadows[4] }} />
                                    <Area type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Paper sx={{ p: 3, minHeight: 400, background: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" gutterBottom>Subscriber Growth</Typography>
                        {growthLoading ? (
                            <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />
                        ) : growthError ? (
                            <ErrorState message="Failed to load subscriber growth" onRetry={fetchReports} />
                        ) : !growthData || growthData.length === 0 ? (
                            <EmptyState
                                title="No subscriber growth data"
                                subtitle="New sign-ups will appear here once recorded."
                            />
                        ) : (
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={growthData}>
                                    <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                    <YAxis stroke={theme.palette.text.secondary} />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: theme.palette.background.paper }} />
                                    <Legend />
                                    <Bar dataKey="active" fill={theme.palette.info.main} radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="newUsers" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Reports;
