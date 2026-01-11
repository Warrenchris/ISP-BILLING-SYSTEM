import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Grid, Paper, Card, CardContent, Button, MenuItem, TextField, LinearProgress
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

const Reports = () => {
    const theme = useTheme();
    const { reportService } = useApi();
    const [period, setPeriod] = useState('monthly');
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState([]);
    const [growthData, setGrowthData] = useState([]);
    const [stats, setStats] = useState({
        revenue: '0',
        activeSubscribers: '0',
        arpu: '0',
        churnRate: '0%',
        revenueChange: 0,
        subscribersChange: 0,
        arpuChange: 0,
        churnChange: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch reports data concurrently
                // Using reportService methods
                const [revenueRes, growthRes, overviewRes] = await Promise.allSettled([
                    reportService.getRevenueReports({ period }),
                    reportService.getSubscriberGrowth({ period }),
                    // Assuming an overview endpoint akin to dashboard stats but possibly scoped
                    // For now mocking or reusing dashboard stats if available, or just mocking for this view
                    // Let's assume reportService has a getOverviewStats 
                    Promise.resolve({
                        data: {
                            revenue: 'Ksh 1.2M',
                            activeSubscribers: 480,
                            arpu: 'Ksh 2,500',
                            churnRate: '3.2%',
                            revenueChange: 12.5,
                            subscribersChange: 8.2,
                            arpuChange: -2.4,
                            churnChange: -0.5
                        }
                    })
                ]);

                if (revenueRes.status === 'fulfilled') {
                    // Normalize data structure
                    // Expected: [{ name: 'Jan', revenue: 4000, projected: 2400 }, ...]
                    const data = revenueRes.value.data?.data || revenueRes.value.data || [];
                    setRevenueData(Array.isArray(data) ? data : []);
                } else {
                    // Fallback mock if API fails or is not implemented
                    setRevenueData([
                        { name: 'Jan', revenue: 4000, projected: 2400 },
                        { name: 'Feb', revenue: 3000, projected: 1398 },
                        { name: 'Mar', revenue: 2000, projected: 9800 },
                        { name: 'Apr', revenue: 2780, projected: 3908 },
                        { name: 'May', revenue: 1890, projected: 4800 },
                        { name: 'Jun', revenue: 2390, projected: 3800 },
                        { name: 'Jul', revenue: 3490, projected: 4300 },
                    ]);
                }

                if (growthRes.status === 'fulfilled') {
                    const data = growthRes.value.data?.data || growthRes.value.data || [];
                    setGrowthData(Array.isArray(data) ? data : []);
                } else {
                    // Fallback mock
                    setGrowthData([
                        { name: 'Week 1', newUsers: 40, active: 240 },
                        { name: 'Week 2', newUsers: 30, active: 300 },
                        { name: 'Week 3', newUsers: 50, active: 380 },
                        { name: 'Week 4', newUsers: 45, active: 420 },
                    ]);
                }

                if (overviewRes.status === 'fulfilled') {
                    setStats(overviewRes.value.data);
                }

            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period, reportService]);

    const StatCard = ({ title, value, change, icon, color }) => (
        <Card sx={{ borderRadius: '16px', background: alpha(theme.palette.background.paper, 0.6), height: '100%' }}>
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
                            borderRadius: '12px',
                            bgcolor: alpha(color, 0.1),
                            color: color,
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
                <Box display="flex" alignItems="center" mt={2}>
                    {change > 0 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                    <Typography
                        variant="body2"
                        color={change > 0 ? 'success.main' : 'error.main'}
                        sx={{ ml: 0.5, fontWeight: 600 }}
                    >
                        {Math.abs(change)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        vs last {period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day'}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

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
                    <TextField select value={period} onChange={(e) => setPeriod(e.target.value)} size="small" sx={{ width: 150, borderRadius: '12px' }}>
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                        <MenuItem value="yearly">Yearly</MenuItem>
                    </TextField>
                    <Button variant="outlined" sx={{ borderRadius: '12px' }}>Export PDF</Button>
                </Box>
            </Box>

            {loading ? <LinearProgress sx={{ mb: 4 }} /> : (
                <>
                    <Grid container spacing={3} mb={4}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Total Revenue" value={stats.revenue} change={stats.revenueChange} icon={<AttachMoney />} color={theme.palette.success.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Active Subscribers" value={stats.activeSubscribers} change={stats.subscribersChange} icon={<People />} color={theme.palette.info.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Avg. Revenue Per User" value={stats.arpu} change={stats.arpuChange} icon={<TrendingDown />} color={theme.palette.warning.main} />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard title="Churn Rate" value={stats.churnRate} change={stats.churnChange} icon={<TrendingUp />} color={theme.palette.error.main} />
                        </Grid>
                    </Grid>

                    <Grid container spacing={3}>
                        <Grid item xs={12} lg={8}>
                            <Paper sx={{ p: 3, borderRadius: '16px', height: 400, background: alpha(theme.palette.background.paper, 0.6) }}>
                                <Typography variant="h6" gutterBottom>Revenue Growth</Typography>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revenueData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                        <YAxis stroke={theme.palette.text.secondary} />
                                        <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '12px', border: 'none', boxShadow: theme.shadows[4] }} />
                                        <Area type="monotone" dataKey="revenue" stroke={theme.palette.primary.main} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} lg={4}>
                            <Paper sx={{ p: 3, borderRadius: '16px', height: 400, background: alpha(theme.palette.background.paper, 0.6) }}>
                                <Typography variant="h6" gutterBottom>Subscriber Growth</Typography>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={growthData}>
                                        <XAxis dataKey="name" stroke={theme.palette.text.secondary} />
                                        <YAxis stroke={theme.palette.text.secondary} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: '12px' }} />
                                        <Legend />
                                        <Bar dataKey="active" fill={theme.palette.info.main} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="newUsers" fill={theme.palette.success.main} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            )}

        </Box>
    );
};

export default Reports;
