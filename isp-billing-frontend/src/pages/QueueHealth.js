import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Alert, CircularProgress,
  Divider, Grid, useTheme, alpha, LinearProgress, Paper
} from '@mui/material';
import {
  Storage as QueueIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Assessment as StatsIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const QueueHealth = () => {
  const { api } = useApi();
  const theme = useTheme();

  const [queueStats, setQueueStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const fetchQueueStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/queues/stats');
      setQueueStats(res.data?.data || {});
    } catch (err) {
      console.error('Error fetching queue stats:', err);
      setError(err.response?.data?.message || 'Failed to load queue stats');
      setQueueStats(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchQueueStats();
    // Poll every 30 seconds
    const interval = setInterval(fetchQueueStats, 30000);
    return () => clearInterval(interval);
  }, [fetchQueueStats]);

  const getHealthColor = (health) => {
    switch (health?.toLowerCase()) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (health) => {
    switch (health?.toLowerCase()) {
      case 'healthy': return <CheckIcon />;
      case 'warning': return <ScheduleIcon />;
      case 'critical': return <ErrorIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const pageTitleSx = {
    fontWeight: 600,
    color: 'text.primary',
    backgroundClip: 'text',
    mb: 4
  };

  if (loading && !queueStats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={pageTitleSx}>
          Queue Health
        </Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !queueStats) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          Queue Health
        </Typography>
        <ErrorState message={error} onRetry={fetchQueueStats} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={pageTitleSx}>
            Queue Health
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor BullMQ job queues and worker status
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchQueueStats}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            background: alpha(theme.palette.background.paper, 0.4),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          Refresh
        </Button>
      </Box>

      {alert.show && (
        <Alert
          severity={alert.severity}
          sx={{
            mb: 3,
            background: alpha(theme.palette.background.paper, 0.95),
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.15)}`,
            '& .MuiAlert-icon': {
              fontSize: 24
            }
          }}
          onClose={() => setAlert({ show: false, message: '', severity: 'info' })}
        >
          <Typography variant="body1" fontWeight={500}>
            {alert.message}
          </Typography>
        </Alert>
      )}

      {!queueStats || Object.keys(queueStats).length === 0 ? (
        <EmptyState
          title="No queue data available"
          subtitle="Queue statistics will appear here once jobs are processed"
          icon={<QueueIcon />}
        />
      ) : (
        <>
          {/* Overall Health Status */}
          {queueStats.overallHealth && (
            <Card sx={{ mb: 4, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '16px',
                        background: alpha(theme.palette[getHealthColor(queueStats.overallHealth)].main, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getHealthIcon(queueStats.overallHealth)}
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight={600}>
                        {queueStats.overallHealth || 'Unknown'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Overall System Health
                      </Typography>
                    </Box>
                  </Box>
                  <Box display="flex" gap={2}>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight={600}>
                        {queueStats.totalQueues || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Queues
                      </Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight={600}>
                        {queueStats.totalWorkers || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Workers
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Queue Stats Grid */}
          <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
            Queue Details
          </Typography>
          <Grid container spacing={3}>
            {Object.entries(queueStats.queues || {}).map(([queueName, stats]) => (
              <Grid item xs={12} md={6} lg={4} key={queueName}>
                <Card
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.15)}`
                    }
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            background: alpha(theme.palette.primary.main, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <QueueIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" fontWeight={600}>
                            {queueName}
                          </Typography>
                          <Chip
                            label={stats.health || 'Unknown'}
                            color={getHealthColor(stats.health)}
                            size="small"
                            icon={getHealthIcon(stats.health)}
                          />
                        </Box>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box display="flex" flexDirection="column" gap={2}>
                      <Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Waiting
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {stats.waiting || 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((stats.waiting || 0) / Math.max(stats.waiting + stats.active + stats.completed, 1) * 100, 100)}
                          sx={{ height: 6 }}
                        />
                      </Box>

                      <Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Active
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {stats.active || 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((stats.active || 0) / Math.max(stats.waiting + stats.active + stats.completed, 1) * 100, 100)}
                          sx={{ height: 6 }}
                          color="primary"
                        />
                      </Box>

                      <Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Completed
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {stats.completed || 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((stats.completed || 0) / Math.max(stats.waiting + stats.active + stats.completed, 1) * 100, 100)}
                          sx={{ height: 6 }}
                          color="success"
                        />
                      </Box>

                      <Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            Failed
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {stats.failed || 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min((stats.failed || 0) / Math.max(stats.waiting + stats.active + stats.completed + stats.failed, 1) * 100, 100)}
                          sx={{ height: 6 }}
                          color="error"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Worker Stats */}
          {queueStats.workers && Object.keys(queueStats.workers).length > 0 && (
            <>
              <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mt: 4, mb: 3 }}>
                Worker Status
              </Typography>
              <Grid container spacing={3}>
                {Object.entries(queueStats.workers || {}).map(([workerId, stats]) => (
                  <Grid item xs={12} md={6} key={workerId}>
                    <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              background: alpha(theme.palette.info.main, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <SpeedIcon sx={{ fontSize: 24, color: 'info.main' }} />
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {workerId}
                            </Typography>
                            <Chip
                              label={stats.status || 'Unknown'}
                              color={stats.status === 'active' ? 'success' : 'default'}
                              size="small"
                            />
                          </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Concurrency
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {stats.concurrency || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Processed
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {stats.processed || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Failed
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {stats.failed || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Uptime
                            </Typography>
                            <Typography variant="body2" fontWeight={500}>
                              {stats.uptime || 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default QueueHealth;
