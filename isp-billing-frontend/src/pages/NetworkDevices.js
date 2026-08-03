import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, CardActions, Typography, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Divider, IconButton, Grid, TextField, useTheme, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Tooltip
} from '@mui/material';
import {
  Router as RouterIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  CloudSync as CloudSyncIcon,
  SyncProblem as ResyncIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

import ConfirmationDialog from '../components/common/ConfirmationDialog';

const NetworkDevices = () => {
  const { api } = useApi();
  const theme = useTheme();

  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [confirmDlg, setConfirmDlg] = useState({ open: false, title: '', message: '', action: null, loading: false });

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    ipAddress: '',
    apiPort: 8728,
    username: '',
    password: '',
    siteId: '',
    routerOsVersion: '7',
    cutoffAddressList: 'cutoff-list'
  });
  const [submitting, setSubmitting] = useState(false);

  // Test connection state
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  // Logs dialog
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);

  // Resync bandwidth state
  const [resyncing, setResyncing] = useState(false);

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/network-devices');
      console.log('Devices response:', res.data);
      setDevices(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching network devices:', err);
      setError(err.response?.data?.message || 'Failed to load network devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get('/admin/network-devices/logs');
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching router logs:', err);
      setLogs([]);
    }
  }, [api]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleOpenDialog = (device = null) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        name: device.name || '',
        ipAddress: device.ipAddress || device.ip_address || '',
        apiPort: device.apiPort || device.api_port || 8728,
        username: device.username || '',
        password: '', // Don't pre-fill password for security
        siteId: device.siteId || device.site_id || '',
        routerOsVersion: device.routerOsVersion || device.router_os_version || '7',
        cutoffAddressList: device.cutoffAddressList || device.cutoff_address_list || 'cutoff-list'
      });
    } else {
      setEditingDevice(null);
      setFormData({
        name: '',
        ipAddress: '',
        apiPort: 8728,
        username: '',
        password: '',
        siteId: '',
        routerOsVersion: '7',
        cutoffAddressList: 'cutoff-list'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDevice(null);
    setFormData({
      name: '',
      ipAddress: '',
      apiPort: 8728,
      username: '',
      password: '',
      siteId: '',
      routerOsVersion: '7',
      cutoffAddressList: 'cutoff-list'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ipAddress.trim()) {
      showAlert('Name and IP address are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        ipAddress: formData.ipAddress.trim(),
        apiPort: parseInt(formData.apiPort) || 8728,
        username: formData.username.trim(),
        password: formData.password,
        siteId: formData.siteId.trim(),
        routerOsVersion: formData.routerOsVersion,
        cutoffAddressList: formData.cutoffAddressList.trim()
      };

      if (editingDevice) {
        await api.put(`/admin/network-devices/${editingDevice.id}`, payload);
        showAlert('Router updated successfully', 'success');
      } else {
        await api.post('/admin/network-devices', payload);
        showAlert('Router added successfully', 'success');
      }

      handleCloseDialog();
      fetchDevices();
    } catch (err) {
      console.error('Error saving device:', err);
      showAlert(err.response?.data?.message || 'Failed to save router', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (device) => {
    setConfirmDlg({
      open: true,
      title: 'Delete Router Device',
      message: `Are you sure you want to delete router "${device.name}"? Active connections using this router may be affected.`,
      action: async () => {
        await api.delete(`/admin/network-devices/${device.id}`);
        showAlert('Router deleted successfully', 'success');
        fetchDevices();
      },
      loading: false
    });
  };

  const handleTestConnection = async (device) => {
    try {
      setTestingId(device.id);
      const res = await api.post(`/admin/network-devices/${device.id}/test`);
      setTestResults(prev => ({
        ...prev,
        [device.id]: {
          success: true,
          message: res.data?.message || 'Connection successful',
          timestamp: new Date().toISOString()
        }
      }));
      showAlert('Connection test successful', 'success');
    } catch (err) {
      console.error('Connection test failed:', err);
      setTestResults(prev => ({
        ...prev,
        [device.id]: {
          success: false,
          message: err.response?.data?.message || 'Connection failed',
          timestamp: new Date().toISOString()
        }
      }));
      showAlert('Connection test failed', 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleViewLogs = () => {
    fetchLogs();
    setLogsDialogOpen(true);
  };

  const handleResyncBandwidth = () => {
    setConfirmDlg({
      open: true,
      title: 'Resync RADIUS Bandwidth',
      message: 'This will resync RADIUS bandwidth limits for ALL active subscriptions to fix upload/download rate mismatches. Continue?',
      action: async () => {
        setResyncing(true);
        try {
          const res = await api.post('/admin/resync-all-bandwidth');
          showAlert(
            res.data?.message || `Bandwidth resync complete. ${res.data?.updated || 0} subscriptions updated.`,
            'success'
          );
        } finally {
          setResyncing(false);
        }
      },
      loading: false
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmDlg.action) return;
    setConfirmDlg(prev => ({ ...prev, loading: true }));
    try {
      await confirmDlg.action();
    } catch (err) {
      console.error('Confirm action failed:', err);
      showAlert(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setConfirmDlg({ open: false, title: '', message: '', action: null, loading: false });
    }
  };
      showAlert(err.response?.data?.message || 'Failed to resync bandwidth', 'error');
    } finally {
      setResyncing(false);
    }
  };

  const getStatusColor = (device) => {
    const testResult = testResults[device.id];
    if (testResult) {
      return testResult.success ? 'success' : 'error';
    }
    return 'default';
  };

  const getStatusLabel = (device) => {
    const testResult = testResults[device.id];
    if (testResult) {
      return testResult.success ? 'Connected' : 'Failed';
    }
    return 'Unknown';
  };

  const pageTitleSx = {
    fontWeight: 600,
    color: 'text.primary',
    backgroundClip: 'text',
    mb: 4
  };

  if (loading && devices.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={pageTitleSx}>
          Network Devices
        </Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error && devices.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          Network Devices
        </Typography>
        <ErrorState message={error} onRetry={fetchDevices} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={pageTitleSx}>
            Network Devices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage MikroTik routers and network infrastructure
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleViewLogs}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              background: alpha(theme.palette.background.paper, 0.4),
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            Command Logs
          </Button>
          <Button
            variant="outlined"
            startIcon={resyncing ? <CircularProgress size={18} color="inherit" /> : <ResyncIcon />}
            onClick={handleResyncBandwidth}
            disabled={resyncing}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              background: alpha(theme.palette.background.paper, 0.4),
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${theme.palette.divider}`
            }}
          >
            {resyncing ? 'Resyncing…' : 'Resync Bandwidth'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDevices}
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
            onClick={() => handleOpenDialog()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              background: theme.palette.primary.main
            }}
          >
            Add Router
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

      {devices.length === 0 ? (
        <EmptyState
          title="No routers configured"
          subtitle="Add your first MikroTik router to begin managing network provisioning"
          icon={<RouterIcon />}
          action={{
            label: 'Add Router',
            onClick: () => handleOpenDialog()
          }}
        />
      ) : (
        <Grid container spacing={3}>
          {devices.map((device) => (
            <Grid item xs={12} md={6} lg={4} key={device.id}>
              <Card
                sx={{
                  height: '100%',
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
                        <RouterIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={600}>
                          {device.name}
                        </Typography>
                        <Chip
                          label={getStatusLabel(device)}
                          color={getStatusColor(device)}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" flexDirection="column" gap={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <WifiIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {device.ipAddress || device.ip_address}:{device.apiPort || device.api_port}
                      </Typography>
                    </Box>
                    {(device.siteId || device.site_id) && (
                      <Box display="flex" alignItems="center" gap={1}>
                        <SettingsIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {device.siteId || device.site_id}
                        </Typography>
                      </Box>
                    )}
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="caption" color="text.secondary">
                        RouterOS v{device.routerOsVersion || device.router_os_version}
                      </Typography>
                    </Box>
                  </Box>

                  {testResults[device.id] && (
                    <Alert
                      severity={testResults[device.id].success ? 'success' : 'error'}
                      sx={{ mt: 2 }}
                      icon={testResults[device.id].success ? <CheckIcon /> : <ErrorIcon />}
                    >
                      <Typography variant="caption">
                        {testResults[device.id].message}
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'flex-end', gap: 1, p: 2 }}>
                  <Tooltip title="Test Connection">
                    <IconButton
                      size="small"
                      onClick={() => handleTestConnection(device)}
                      disabled={testingId === device.id}
                      color="primary"
                    >
                      {testingId === device.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <CloudSyncIcon />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(device)}
                      color="info"
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(device)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDevice ? 'Edit Router' : 'Add New Router'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Router Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="IP Address"
              value={formData.ipAddress}
              onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
              required
              placeholder="192.168.1.1"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="API Port"
              type="number"
              value={formData.apiPort}
              onChange={(e) => setFormData({ ...formData, apiPort: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="API Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="API Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={editingDevice ? 'Leave blank to keep current password' : ''}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Site ID"
              value={formData.siteId}
              onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
              placeholder="e.g., main-office, branch-a"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="RouterOS Version"
              value={formData.routerOsVersion}
              onChange={(e) => setFormData({ ...formData, routerOsVersion: e.target.value })}
              placeholder="7"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Cutoff Address List"
              value={formData.cutoffAddressList}
              onChange={(e) => setFormData({ ...formData, cutoffAddressList: e.target.value })}
              placeholder="cutoff-list"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{
              background: theme.palette.primary.main
            }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : (editingDevice ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onClose={() => setLogsDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Router Command Logs</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Router</TableCell>
                  <TableCell>Command</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Response</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No command logs available
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.deviceName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                          {log.command}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={log.success ? 'Success' : 'Failed'}
                          color={log.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {log.response || 'No response'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NetworkDevices;
