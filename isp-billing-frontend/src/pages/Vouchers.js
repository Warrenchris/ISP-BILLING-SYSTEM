import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Divider, IconButton, Grid, TextField, useTheme, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Tooltip, MenuItem, Select, FormControl, InputLabel,
  Tabs, Tab
} from '@mui/material';
import {
  ConfirmationNumber as VoucherIcon,
  Add as AddIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const Vouchers = () => {
  const { api } = useApi();
  const theme = useTheme();

  const [tabValue, setTabValue] = useState(0);
  const [vouchers, setVouchers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Generate dialog
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    quantity: 10,
    dataPlanId: '',
    validityDays: 30,
    prefix: ''
  });

  // Data plans for generate dialog
  const [dataPlans, setDataPlans] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    batchId: ''
  });

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/vouchers/stats');
      setStats(res.data?.data || {});
    } catch (err) {
      console.error('Error fetching voucher stats:', err);
    }
  }, [api]);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await api.get('/vouchers/batches');
      setBatches(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching voucher batches:', err);
    }
  }, [api]);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.batchId) params.batchId = filters.batchId;

      const res = await api.get('/vouchers', { params });
      setVouchers(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
      setError(err.response?.data?.message || 'Failed to load vouchers');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  // Fetch data plans for the generate dialog
  const fetchDataPlans = useCallback(async () => {
    try {
      const res = await api.get('/plans');
      setDataPlans(res.data?.data?.plans || res.data?.data || []);
    } catch (err) {
      console.error('Error fetching data plans:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchStats();
    fetchBatches();
    fetchVouchers();
    fetchDataPlans();
  }, [fetchStats, fetchBatches, fetchVouchers, fetchDataPlans]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!generateForm.dataPlanId) {
      showAlert('Please select a data plan', 'error');
      return;
    }

    try {
      setGenerating(true);
      const payload = {
        quantity: parseInt(generateForm.quantity) || 10,
        dataPlanId: generateForm.dataPlanId,
        validityDays: parseInt(generateForm.validityDays) || 30,
        prefix: generateForm.prefix.trim()
      };

      await api.post('/vouchers/generate', payload);
      showAlert('Vouchers generated successfully', 'success');
      setGenerateDialogOpen(false);
      setGenerateForm({
        quantity: 10,
        dataPlanId: '',
        validityDays: 30,
        prefix: ''
      });
      fetchBatches();
      fetchVouchers();
      fetchStats();
    } catch (err) {
      console.error('Error generating vouchers:', err);
      showAlert(err.response?.data?.message || 'Failed to generate vouchers', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (voucherId) => {
    if (!window.confirm('Are you sure you want to revoke this voucher?')) return;

    try {
      await api.post(`/vouchers/${voucherId}/revoke`);
      showAlert('Voucher revoked successfully', 'success');
      fetchVouchers();
      fetchStats();
    } catch (err) {
      console.error('Error revoking voucher:', err);
      showAlert(err.response?.data?.message || 'Failed to revoke voucher', 'error');
    }
  };

  const handleExport = async (batchId) => {
    try {
      const res = await api.get(`/vouchers/export/${batchId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vouchers-${batchId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showAlert('Vouchers exported successfully', 'success');
    } catch (err) {
      console.error('Error exporting vouchers:', err);
      showAlert('Failed to export vouchers', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'used': return 'default';
      case 'revoked': return 'error';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return <CheckIcon />;
      case 'used': return <PendingIcon />;
      case 'revoked': return <BlockIcon />;
      case 'expired': return <CancelIcon />;
      default: return <PendingIcon />;
    }
  };

  const pageTitleSx = {
    fontWeight: 600,
    color: 'text.primary',
    backgroundClip: 'text',
    mb: 4
  };

  if (loading && vouchers.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={pageTitleSx}>
          Vouchers
        </Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error && vouchers.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          Vouchers
        </Typography>
        <ErrorState message={error} onRetry={fetchVouchers} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={pageTitleSx}>
            Vouchers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage RADIUS vouchers for hotspot authentication
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchStats();
              fetchBatches();
              fetchVouchers();
            }}
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setGenerateDialogOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: theme.palette.primary.main
            }}
          >
            Generate Vouchers
          </Button>
        </Box>
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

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
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
                    <VoucherIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.total || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Vouchers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: alpha(theme.palette.success.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CheckIcon sx={{ fontSize: 28, color: 'success.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.active || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: alpha(theme.palette.info.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <PendingIcon sx={{ fontSize: 28, color: 'info.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.used || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Used
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: alpha(theme.palette.error.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BlockIcon sx={{ fontSize: 28, color: 'error.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.revoked || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Revoked
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Vouchers" />
          <Tab label="Batches" />
        </Tabs>
      </Box>

      {/* Vouchers Tab */}
      {tabValue === 0 && (
        <>
          <Box display="flex" gap={2} mb={3} alignItems="center">
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="used">Used</MenuItem>
                <MenuItem value="revoked">Revoked</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Batch</InputLabel>
              <Select
                value={filters.batchId}
                label="Batch"
                onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}
              >
                <MenuItem value="">All Batches</MenuItem>
                {batches.map((batch) => (
                  <MenuItem key={batch.id} value={batch.id}>
                    {batch.name || batch.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {vouchers.length === 0 ? (
            <EmptyState
              title="No vouchers found"
              subtitle="Generate your first batch of vouchers"
              icon={<VoucherIcon />}
              action={{
                label: 'Generate Vouchers',
                onClick: () => setGenerateDialogOpen(true)
              }}
            />
          ) : (
            <TableContainer component={Paper} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Batch</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vouchers.map((voucher) => (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                          {voucher.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={voucher.status || 'Unknown'}
                          color={getStatusColor(voucher.status)}
                          size="small"
                          icon={getStatusIcon(voucher.status)}
                        />
                      </TableCell>
                      <TableCell>{voucher.DataPlan?.name || '—'}</TableCell>
                      <TableCell>{voucher.batchId || '—'}</TableCell>
                      <TableCell>
                        {voucher.createdAt ? new Date(voucher.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        {voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        {voucher.status === 'active' && (
                          <Tooltip title="Revoke">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRevoke(voucher.id)}
                            >
                              <BlockIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* Batches Tab */}
      {tabValue === 1 && (
        <>
          {batches.length === 0 ? (
            <EmptyState
              title="No voucher batches"
              subtitle="Generate your first batch of vouchers"
              icon={<VoucherIcon />}
              action={{
                label: 'Generate Vouchers',
                onClick: () => setGenerateDialogOpen(true)
              }}
            />
          ) : (
            <Grid container spacing={3}>
              {batches.map((batch) => (
                <Grid item xs={12} md={6} lg={4} key={batch.id}>
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
                            <VoucherIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                          </Box>
                          <Box>
                            <Typography variant="h6" fontWeight={600}>
                              {batch.name || batch.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {batch.quantity || 0} vouchers
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Box display="flex" flexDirection="column" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          Created: {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Plan: {batch.DataPlan?.name || '—'}
                        </Typography>
                      </Box>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
                      <Tooltip title="Export CSV">
                        <IconButton
                          size="small"
                          onClick={() => handleExport(batch.id)}
                          color="primary"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Generate Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Vouchers</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleGenerate} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Quantity"
              type="number"
              value={generateForm.quantity}
              onChange={(e) => setGenerateForm({ ...generateForm, quantity: e.target.value })}
              required
              inputProps={{ min: 1, max: 1000 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Validity (days)"
              type="number"
              value={generateForm.validityDays}
              onChange={(e) => setGenerateForm({ ...generateForm, validityDays: e.target.value })}
              required
              inputProps={{ min: 1 }}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Prefix (optional)"
              value={generateForm.prefix}
              onChange={(e) => setGenerateForm({ ...generateForm, prefix: e.target.value })}
              placeholder="e.g., HOTSPOT-"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Data Plan</InputLabel>
              <Select
                value={generateForm.dataPlanId}
                label="Data Plan"
                onChange={(e) => setGenerateForm({ ...generateForm, dataPlanId: e.target.value })}
                required
              >
                <MenuItem value="">Select a plan</MenuItem>
                {dataPlans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name} — {plan.price ? `KES ${plan.price}` : ''} {plan.dataLimit ? `(${plan.dataLimit} MB)` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={generating}
            sx={{
              background: theme.palette.primary.main
            }}
          >
            {generating ? <CircularProgress size={20} color="inherit" /> : 'Generate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vouchers;
