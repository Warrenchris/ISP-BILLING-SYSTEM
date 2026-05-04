import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  Alert,
  Chip,
  Button,
  Avatar,
  useTheme,
  alpha,
  Skeleton } from '@mui/material';
import {
  DataUsage as DataUsageIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  NetworkCheck as NetworkCheckIcon,
  Refresh as RefreshIcon,
  BarChartOutlined as BarChartOutlinedIcon } from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell } from 'recharts';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const DataUsage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { api } = useApi();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const fetchUsageData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/users/${user.id}/data-usage`);
      setOverview(res.data?.data ?? null);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError(err.response?.data?.message || 'Failed to load usage data');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [api, user?.id]);

  useEffect(() => {
    fetchUsageData();
  }, [fetchUsageData]);

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0 || bytes == null) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = () => {
    if (!overview || !overview.totalLimit) return 0;
    return Math.min((overview.totalUsed / overview.totalLimit) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return theme.palette.error.main;
    if (percentage >= 75) return theme.palette.warning.main;
    return theme.palette.primary.main;
  };

  const usageHistory = overview?.history ?? [];
  const hasChartActivity = usageHistory.some(
    (row) =>
      (
        Number(row.usageMB ?? 0) +
        Number(row.downloaded ?? 0) +
        Number(row.uploaded ?? 0)
      ) >
      0
  );

  // Modern Glass Card Component
  const GlassCard = ({ children, sx = {}, ...props }) => (
    <Card
      sx={{
        background: theme.palette.background.paper,
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: `1px solid ${theme.palette.divider}`,
        
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.3)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.1)}`,
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
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)' },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.15)' },
        ...sx }}
      {...props}
    >
      {children}
    </Card>
  );

  // Modern Stat Card Component
  const StatCard = ({ icon, title, value, subtitle, color = theme.palette.primary.main }) => (
    <GlassCard>
      <CardContent sx={{ p: 3, textAlign: 'center' }}>
        <Avatar
          sx={{
            width: 64,
            height: 64,
            background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
            margin: '0 auto 16px',
            boxShadow: `0 8px 25px ${alpha(color, 0.3)}` }}
        >
          {icon}
        </Avatar>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500, mb: 1 }}
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
            mb: 1 }}
        >
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </GlassCard>
  );

  const chartData = usageHistory.map(item => ({
    dateLabel: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    downloaded: Number(item.downloaded) || 0,
    uploaded: Number(item.uploaded) || 0,
    total: (Number(item.downloaded) || 0) + (Number(item.uploaded) || 0) }));

  const pieData =
    overview && overview.totalLimit > 0
      ? [
        { name: 'Used', value: getUsagePercentage(), color: getUsageColor() },
        { name: 'Remaining', value: 100 - getUsagePercentage(), color: alpha(getUsageColor(), 0.2) },
      ]
      : [
        {
          name: 'Plan',
          value: 100,
          color: theme.palette.action.disabledBackground,
        },
      ];

  const pageTitleSx = {
    fontWeight: 700,
    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    mb: 4 };

  if (!user?.id) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={pageTitleSx}>
          Data Usage
        </Typography>
        <EmptyState title="Sign in required" subtitle="Please log in to view your usage." />
      </Box>
    );
  }

  if (loading && !overview) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          Data Usage
        </Typography>
        <Skeleton variant="rounded" height={280} sx={{ mb: 2 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
        </Grid>
        <Skeleton variant="rounded" height={360} sx={{ mt: 3 }} />
      </Box>
    );
  }

  if (error && !overview) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          Data Usage
        </Typography>
        <ErrorState message={error} onRetry={fetchUsageData} />
      </Box>
    );
  }

  const remainingBytes =
    overview && overview.totalLimit > 0
      ? Math.max(0, overview.totalLimit - overview.totalUsed)
      : null;

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={{ ...pageTitleSx, mb: 1 }}>
            Data Usage
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor your internet usage and performance metrics
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchUsageData().catch(() =>
            showAlert('Could not refresh', 'error')
          )}
          disabled={loading}
          sx={{
            
            textTransform: 'none',
            fontWeight: 500,
            background: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`,
            '&:hover': {
              background: alpha(theme.palette.common.white, 0.1),
              borderColor: alpha(theme.palette.common.white, 0.2),
              transform: 'translateY(-1px)' } }}
        >
          Refresh
        </Button>
      </Box>

      {alert.show && (
        <Alert
          severity={alert.severity}
          sx={{
            mb: 3,
            
            background: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}` }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Usage Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12 }} lg={8}>
          <GlassCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Current Usage Overview
              </Typography>

              <Box mb={4}>
                <Box display="flex" justifyContent="space-between" mb={2}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Data Used
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {overview ? formatBytes(overview.totalUsed) : '0 MB'} / {overview?.totalLimit ? formatBytes(overview.totalLimit) : 'No quota'}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage()}
                  sx={{
                    height: 16,
                    
                    backgroundColor: theme.palette.divider,
                    '& .MuiLinearProgress-bar': {
                      background: `linear-gradient(135deg, ${getUsageColor()} 0%, ${alpha(getUsageColor(), 0.8)} 100%)`,
                      
                      boxShadow: `0 2px 8px ${alpha(getUsageColor(), 0.3)}` } }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {overview?.totalLimit
                    ? `${getUsagePercentage().toFixed(1)}% of your data plan used`
                    : 'No active plan quota on file'}
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    icon={<DataUsageIcon sx={{ fontSize: 28 }} />}
                    title="Today's Usage"
                    value={overview ? formatBytes(overview.dailyUsage) : '0 Bytes'}
                    color={theme.palette.primary.main}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    icon={<SpeedIcon sx={{ fontSize: 28 }} />}
                    title="Avg Speed"
                    value={
                      overview?.averageSpeedMbps == null
                        ? '—'
                        : `${Number(overview.averageSpeedMbps).toFixed(1)} Mbps`}
                    color={theme.palette.success.main}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    icon={<NetworkCheckIcon sx={{ fontSize: 28 }} />}
                    title="Active Sessions"
                    value={overview?.activeSessions ?? 0}
                    color={theme.palette.info.main}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
                    title="Trend"
                    value={
                      <Chip
                        label={overview?.weeklyTrend || 'stable'}
                        size="small"
                        sx={{
                          background: overview?.weeklyTrend === 'increasing'
                            ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                            : `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                          color: 'text.primary',
                          fontWeight: 500,
                          textTransform: 'capitalize' }}
                      />
                    }
                    color={theme.palette.warning.main}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12 }} lg={4}>
          <GlassCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Usage Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Usage']} />
                </PieChart>
              </ResponsiveContainer>
              <Box textAlign="center" mt={2}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: getUsageColor() }}
                >
                  {remainingBytes != null ? formatBytes(remainingBytes) : '—'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  remaining this month
                </Typography>
              </Box>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Usage Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12 }} lg={8}>
          <GlassCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Daily Usage Trend (Last 30 Days)
              </Typography>
              {!hasChartActivity ? (
                <EmptyState
                  icon={<BarChartOutlinedIcon />}
                  title="No usage in this period"
                  subtitle="Daily totals will appear here once sessions are recorded."
                  action={{
                    label: 'Refresh',
                    onClick: () => fetchUsageData(),
                  }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.charts.teal} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={theme.palette.charts.teal} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="dateLabel" stroke={theme.palette.text.secondary} />
                    <YAxis tickFormatter={(value) => `${value} MB`} stroke={theme.palette.text.secondary} />
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} MB`,
                        name === 'total' ? 'Total Usage' : name,
                      ]}
                      contentStyle={{
                        background: alpha(theme.palette.background.paper, 0.9),
                        border: `1px solid ${theme.palette.divider}`,
                        
                        backdropFilter: 'blur(20px)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke={theme.palette.charts.teal}
                      strokeWidth={3}
                      fill="url(#colorTotal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid size={{ xs: 12 }} lg={4}>
          <GlassCard>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Upload vs Download (Last 7 Days)
              </Typography>
              {!hasChartActivity ? (
                <EmptyState
                  icon={<BarChartOutlinedIcon />}
                  title="No breakdown yet"
                  subtitle="Upload and download totals will chart here once you have usage data."
                  action={{
                    label: 'Refresh',
                    onClick: () => fetchUsageData(),
                  }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="dateLabel" stroke={theme.palette.text.secondary} />
                    <YAxis tickFormatter={(value) => `${value} MB`} stroke={theme.palette.text.secondary} />
                    <Tooltip
                      formatter={(value, name) => [`${value} MB`, name === 'downloaded' ? 'Downloaded' : 'Uploaded']}
                      contentStyle={{
                        background: alpha(theme.palette.background.paper, 0.9),
                        border: `1px solid ${theme.palette.divider}`,
                        
                        backdropFilter: 'blur(20px)' }}
                    />
                    <Bar dataKey="downloaded" fill={theme.palette.charts.blue} name="Downloaded" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="uploaded" fill={theme.palette.charts.purple} name="Uploaded" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Usage Alerts */}
      {(overview?.totalLimit ?? 0) > 0 && getUsagePercentage() >= 90 && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            
            background: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)' }}
        >
          <Typography variant="body1" fontWeight="medium">
            Data Usage Alert
          </Typography>
          You have used {getUsagePercentage().toFixed(1)}% of your data plan. Consider upgrading your plan or monitoring your usage.
        </Alert>
      )}

      {(overview?.totalLimit ?? 0) > 0 &&
        getUsagePercentage() >= 75 &&
        getUsagePercentage() <
        90 && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              
              background: alpha(theme.palette.warning.main, 0.1),
              border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)' }}
          >
            <Typography variant="body1" fontWeight="medium">
              Data Usage Warning
            </Typography>
            You have used {getUsagePercentage().toFixed(1)}% of your data plan. You&apos;re approaching your limit.
          </Alert>
        )}

      {/* Data Saving Tips */}
      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Data Saving Tips
          </Typography>
          <Grid container spacing={3}>
            {[
              {
                icon: '📺',
                title: 'Video Streaming',
                description: 'Lower video quality to reduce data consumption',
                color: theme.palette.error.main },
              {
                icon: '📱',
                title: 'App Updates',
                description: 'Update apps only when connected to Wi-Fi',
                color: theme.palette.info.main },
              {
                icon: '🔄',
                title: 'Background Apps',
                description: 'Disable background data for unused apps',
                color: theme.palette.success.main },
              {
                icon: '🗜️',
                title: 'Data Compression',
                description: 'Enable data saver mode in your browser',
                color: theme.palette.warning.main },
            ].map((tip, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                <Box
                  sx={{
                    p: 3,
                    
                    background: `${alpha(tip.color, 0.1)}`,
                    border: `1px solid ${alpha(tip.color, 0.2)}`,
                    textAlign: 'center',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 25px ${alpha(tip.color, 0.2)}` } }}
                >
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {tip.icon}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {tip.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tip.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </GlassCard>
    </Box>
  );
};

export default DataUsage;
