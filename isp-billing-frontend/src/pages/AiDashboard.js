import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Autorenew as AutorenewIcon,
  Refresh as RefreshIcon,
  SmartToy as SmartToyIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';
import aiService from '../services/aiService';
import { useAi } from '../contexts/AiContext';
import { useAuth } from '../contexts/AuthContext';

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatKes = (value) => `KES ${Number(value || 0).toLocaleString()}`;

const getRiskColor = (riskLevel, theme) => {
  const normalized = String(riskLevel || '').toUpperCase();
  if (normalized === 'HIGH') return { bg: alpha(theme.palette.error.main, 0.14), color: theme.palette.error.main };
  if (normalized === 'MEDIUM') return { bg: alpha(theme.palette.warning.main, 0.16), color: theme.palette.warning.main };
  return { bg: alpha(theme.palette.success.main, 0.14), color: theme.palette.success.main };
};

const getAnomalyTypeLabel = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('revenue')) return 'Revenue Deviation';
  if (normalized.includes('duplicate')) return 'Duplicate Payment';
  if (normalized.includes('usage')) return 'Usage Spike';
  return type || 'Anomaly';
};

const normalizeFeatureValue = (item) => {
  if (typeof item?.contribution_pct === 'number') return Math.max(0, Math.min(100, item.contribution_pct));
  if (typeof item?.weight === 'number') return Math.max(0, Math.min(100, item.weight));
  if (typeof item?.importance === 'number') return Math.max(0, Math.min(100, item.importance));
  return 0;
};

const AiDashboard = () => {
  const theme = useTheme();
  const location = useLocation();
  const { user } = useAuth();
  const {
    dashboardSummary,
    churnRisks,
    anomalies,
    isLoadingDashboard,
    isLoadingChurn,
    isLoadingAnomalies,
    errors,
    fetchDashboardSummary,
    fetchChurnRisks,
    fetchAnomalies,
  } = useAi();

  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  const [forecastPayload, setForecastPayload] = useState({
    activeSubscribers: 100,
    avgDataUsageMB: 30000,
    paymentDelays: 5,
    basic: 40,
    standard: 40,
    premium: 20,
  });
  const [forecastResult, setForecastResult] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [retrainLoading, setRetrainLoading] = useState(false);

  const revenueRef = useRef(null);
  const churnRef = useRef(null);
  const anomaliesRef = useRef(null);

  const highRiskCount = useMemo(
    () => churnRisks.filter((item) => String(item.riskLevel || '').toUpperCase() === 'HIGH').length,
    [churnRisks]
  );
  const mediumRiskCount = useMemo(
    () => churnRisks.filter((item) => String(item.riskLevel || '').toUpperCase() === 'MEDIUM').length,
    [churnRisks]
  );

  const criticalCount = useMemo(
    () =>
      anomalies.filter((item) => {
        const severity = String(item.severity || item.level || '').toLowerCase();
        return severity === 'critical' || severity === 'high';
      }).length,
    [anomalies]
  );

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const response = await aiService.getHealth();
      setHealth(response.data || null);
    } catch (error) {
      setHealthError(error.response?.data?.message || error.message || 'Unable to reach AI health endpoint');
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadHealth(),
      fetchDashboardSummary(),
      fetchChurnRisks(),
      fetchAnomalies(),
    ]);
  }, [loadHealth, fetchDashboardSummary, fetchChurnRisks, fetchAnomalies]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const target = location.state?.scrollTo;
    if (!target) return;
    const refs = {
      revenue: revenueRef,
      churn: churnRef,
      anomalies: anomaliesRef,
    };
    const selectedRef = refs[target];
    if (selectedRef?.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state]);

  const handleForecastChange = (key, value) => {
    setForecastPayload((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleForecastSubmit = async (event) => {
    event.preventDefault();
    setForecastLoading(true);
    setForecastError('');
    try {
      const response = await aiService.predictRevenue({
        activeSubscribers: Number(forecastPayload.activeSubscribers || 0),
        avgDataUsageMB: Number(forecastPayload.avgDataUsageMB || 0),
        paymentDelays: Number(forecastPayload.paymentDelays || 0),
        planDistribution: {
          basic: Number(forecastPayload.basic || 0),
          standard: Number(forecastPayload.standard || 0),
          premium: Number(forecastPayload.premium || 0),
        },
      });
      setForecastResult(response.data?.data || null);
    } catch (error) {
      setForecastError(error.response?.data?.message || error.message || 'Failed to generate AI revenue forecast');
      setForecastResult(null);
    } finally {
      setForecastLoading(false);
    }
  };

  const handleRetrain = async () => {
    const ok = window.confirm('Are you sure? This will retrain AI models using current data.');
    if (!ok) return;
    setRetrainLoading(true);
    try {
      await aiService.retrain();
      await refreshAll();
    } catch (error) {
      console.error('Error retraining models:', error);
    } finally {
      setRetrainLoading(false);
    }
  };

  const isHealthOnline = health?.status === 'ok' && health?.db === 'connected';

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AI Dashboard
          </Typography>
          <Typography color="text.secondary">
            Revenue forecasting, churn intelligence, anomaly detection, and AI summaries
          </Typography>
        </Box>
        <Box display="flex" gap={1.5}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshAll}
            disabled={healthLoading || isLoadingDashboard || isLoadingChurn || isLoadingAnomalies}
          >
            Refresh All
          </Button>
          {user?.role === 'admin' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<AutorenewIcon />}
              onClick={handleRetrain}
              disabled={retrainLoading}
            >
              {retrainLoading ? 'Retraining...' : 'Retrain Models'}
            </Button>
          )}
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3, background: alpha(theme.palette.background.paper, 0.65) }}>
        {healthLoading && <LinearProgress sx={{ mb: 1.5 }} />}
        <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={isHealthOnline ? 'AI Service Online' : 'AI Service Offline'}
              color={isHealthOnline ? 'success' : 'error'}
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="body2" color="text.secondary">
              {(health?.modules || []).join(' · ') || 'mlr · churn · anomaly · llm'}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Last updated: {formatDateTime(health?.timestamp || new Date())}
          </Typography>
        </Box>
        {healthError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {healthError}
          </Alert>
        )}
      </Paper>

      <Card ref={revenueRef} sx={{ mb: 3, background: alpha(theme.palette.background.paper, 0.7) }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Revenue Forecast
          </Typography>
          <Box component="form" onSubmit={handleForecastSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Active Subscribers"
                  type="number"
                  value={forecastPayload.activeSubscribers}
                  onChange={(e) => handleForecastChange('activeSubscribers', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Avg Data Usage MB"
                  type="number"
                  value={forecastPayload.avgDataUsageMB}
                  onChange={(e) => handleForecastChange('avgDataUsageMB', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Payment Delays"
                  type="number"
                  value={forecastPayload.paymentDelays}
                  onChange={(e) => handleForecastChange('paymentDelays', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Basic Plan (%)"
                  type="number"
                  value={forecastPayload.basic}
                  onChange={(e) => handleForecastChange('basic', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Standard Plan (%)"
                  type="number"
                  value={forecastPayload.standard}
                  onChange={(e) => handleForecastChange('standard', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Premium Plan (%)"
                  type="number"
                  value={forecastPayload.premium}
                  onChange={(e) => handleForecastChange('premium', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button type="submit" variant="contained" disabled={forecastLoading}>
                  {forecastLoading ? 'Generating...' : 'Generate Forecast'}
                </Button>
              </Grid>
            </Grid>
          </Box>
          {forecastLoading && <LinearProgress sx={{ mt: 2 }} />}
          {forecastError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {forecastError}
            </Alert>
          )}
          {forecastResult && (
            <Box mt={2.5}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {formatKes(forecastResult.predictedRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {formatKes(forecastResult.confidenceInterval?.low)} — {formatKes(forecastResult.confidenceInterval?.high)} (95% CI)
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Period: {forecastResult.forecastPeriod || 'N/A'}
              </Typography>

              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 600 }}>
                Feature Importance
              </Typography>
              {(forecastResult.influencingFactors || []).map((item) => {
                const pct = normalizeFeatureValue(item);
                return (
                  <Box key={item.factor} sx={{ mb: 1.2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {String(item.factor || '').replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 8, borderRadius: 4, background: alpha(theme.palette.primary.main, 0.16), overflow: 'hidden' }}>
                      <Box sx={{ width: `${pct}%`, height: '100%', background: theme.palette.primary.main }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card ref={churnRef} sx={{ mb: 3, background: alpha(theme.palette.background.paper, 0.7) }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            Customer Churn Risks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {highRiskCount} high risk · {mediumRiskCount} medium risk customers identified
          </Typography>
          {isLoadingChurn ? (
            <LinearProgress />
          ) : errors.churn ? (
            <Alert severity="error">{errors.churn}</Alert>
          ) : (
            <TableContainer component={Paper} sx={{ background: alpha(theme.palette.background.paper, 0.45) }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Risk Score</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Risk Level</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Top Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {churnRisks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">No customers currently flagged at risk.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    churnRisks.map((row) => {
                      const colors = getRiskColor(row.riskLevel, theme);
                      const riskScore = Number(row.score || 0) * 100;
                      return (
                        <TableRow key={row.customerId || row.email}>
                          <TableCell>{row.customerName || 'N/A'}</TableCell>
                          <TableCell>{row.email || 'N/A'}</TableCell>
                          <TableCell>{riskScore.toFixed(0)}%</TableCell>
                          <TableCell>
                            <Chip
                              label={row.riskLevel || 'LOW'}
                              size="small"
                              sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>{row.topReason || 'N/A'}</TableCell>
                          <TableCell>
                            <Button
                              component={Link}
                              to={`/users/${row.customerId}`}
                              size="small"
                              variant="text"
                            >
                              View Customer
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card ref={anomaliesRef} sx={{ mb: 3, background: alpha(theme.palette.background.paper, 0.7) }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Billing Anomalies
          </Typography>
          {isLoadingAnomalies ? (
            <LinearProgress />
          ) : errors.anomalies ? (
            <Alert severity="error">{errors.anomalies}</Alert>
          ) : anomalies.length === 0 ? (
            <Alert severity="success">No anomalies detected.</Alert>
          ) : (
            <Grid container spacing={2}>
              {anomalies.map((anomaly, index) => {
                const severity = String(anomaly.severity || anomaly.level || 'warning').toLowerCase();
                const isCritical = severity === 'critical' || severity === 'high';
                return (
                  <Grid key={anomaly.id || index} size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2, background: alpha(theme.palette.background.paper, 0.5) }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {isCritical ? '🔴' : '⚠️'} {getAnomalyTypeLabel(anomaly.type || anomaly.category)}
                        </Typography>
                        <Chip
                          size="small"
                          label={isCritical ? 'Critical' : 'Warning'}
                          color={isCritical ? 'error' : 'warning'}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        Customer: {anomaly.customer_name || anomaly.customerName || 'N/A'}
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {anomaly.details || anomaly.message || anomaly.reason || 'Anomaly detected by AI model.'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Detected at: {formatDateTime(anomaly.detected_at || anomaly.detectedAt || anomaly.created_at)}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      <Card sx={{ background: alpha(theme.palette.info.main, 0.08), border: `1px solid ${alpha(theme.palette.info.main, 0.25)}` }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            AI Insights Summary
          </Typography>
          {isLoadingDashboard ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={18} />
              <Typography color="text.secondary">Loading AI summary...</Typography>
            </Box>
          ) : errors.dashboard ? (
            <Alert severity="error">{errors.dashboard}</Alert>
          ) : (
            <>
              <Alert
                icon={<SmartToyIcon fontSize="inherit" />}
                severity="info"
                sx={{ mb: 2, background: alpha(theme.palette.info.main, 0.1) }}
              >
                {dashboardSummary?.aiSummary || 'AI summary not available yet.'}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Period: {dashboardSummary?.period || 'N/A'}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    Predicted revenue: <strong>{formatKes(dashboardSummary?.revenue?.predicted)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Actual revenue: <strong>{formatKes(dashboardSummary?.revenue?.actual)}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Variance: <strong>{dashboardSummary?.revenue?.variancePct ?? 0}%</strong>
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2">
                    Total at-risk customers: <strong>{dashboardSummary?.churn?.totalAtRisk ?? highRiskCount}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Total anomalies: <strong>{dashboardSummary?.anomalies?.total ?? anomalies.length}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Critical anomalies: <strong>{dashboardSummary?.anomalies?.critical ?? criticalCount}</strong>
                  </Typography>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AiDashboard;
