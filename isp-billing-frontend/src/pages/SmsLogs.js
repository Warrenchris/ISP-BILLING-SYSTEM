import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
  Divider, IconButton, Grid, TextField, useTheme, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Tooltip, Tabs, Tab, MenuItem, Select, FormControl, InputLabel,
  TablePagination
} from '@mui/material';
import {
  Sms as SmsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  AttachMoney as CostIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';

const SmsLogs = () => {
  const { api } = useApi();
  const theme = useTheme();

  const [tabValue, setTabValue] = useState(0);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });

  // Edit template dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateContent, setTemplateContent] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/sms/stats');
      setStats(res.data?.data || {});
    } catch (err) {
      console.error('Error fetching SMS stats:', err);
    }
  }, [api]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await api.get('/admin/sms/logs', { params });
      setLogs(res.data?.data || []);
    } catch (err) {
      console.error('Error fetching SMS logs:', err);
      setError(err.response?.data?.message || 'Failed to load SMS logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [api, filters]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get('/admin/sms/templates');
      setTemplates(res.data?.data || {});
    } catch (err) {
      console.error('Error fetching SMS templates:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
    fetchTemplates();
  }, [fetchStats, fetchLogs, fetchTemplates]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleEditTemplate = (key) => {
    setEditingTemplate(key);
    setTemplateContent(templates[key] || '');
    setEditDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    try {
      await api.put(`/admin/sms/templates/${editingTemplate}`, {
        content: templateContent
      });
      showAlert('Template updated successfully', 'success');
      setEditDialogOpen(false);
      setEditingTemplate(null);
      setTemplateContent('');
      fetchTemplates();
    } catch (err) {
      console.error('Error updating template:', err);
      showAlert(err.response?.data?.message || 'Failed to update template', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent': return 'success';
      case 'failed': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent': return <CheckIcon />;
      case 'failed': return <ErrorIcon />;
      case 'pending': return <ScheduleIcon />;
      default: return <ScheduleIcon />;
    }
  };

  const pageTitleSx = {
    fontWeight: 600,
    color: 'text.primary',
    backgroundClip: 'text',
    mb: 4
  };

  if (loading && logs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={pageTitleSx}>
          SMS Logs & Stats
        </Typography>
        <CircularProgress />
      </Box>
    );
  }

  if (error && logs.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ ...pageTitleSx, mb: 2 }}>
          SMS Logs & Stats
        </Typography>
        <ErrorState message={error} onRetry={fetchLogs} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={pageTitleSx}>
            SMS Logs & Stats
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Monitor SMS delivery, costs, and manage notification templates
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchStats();
            fetchLogs();
            fetchTemplates();
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
                    <SmsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.totalSent || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sent
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
                      {stats.successRate || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Success Rate
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
                    <ErrorIcon sx={{ fontSize: 28, color: 'error.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      {stats.failed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
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
                      background: alpha(theme.palette.warning.main, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CostIcon sx={{ fontSize: 28, color: 'warning.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      ${stats.totalCost || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Cost
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
          <Tab label="SMS Logs" />
          <Tab label="Templates" />
        </Tabs>
      </Box>

      {/* SMS Logs Tab */}
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
                <MenuItem value="sent">Sent</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              type="date"
              label="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
          </Box>

          {logs.length === 0 ? (
            <EmptyState
              title="No SMS logs found"
              subtitle="SMS delivery logs will appear here"
              icon={<SmsIcon />}
            />
          ) : (
            <Paper sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '16px', overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Recipient</TableCell>
                      <TableCell>Template</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Sent At</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {log.recipient || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{log.template || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.status || 'Unknown'}
                            color={getStatusColor(log.status)}
                            size="small"
                            icon={getStatusIcon(log.status)}
                          />
                        </TableCell>
                        <TableCell>${log.cost || 0}</TableCell>
                        <TableCell>
                          {log.sentAt ? new Date(log.sentAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.message || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={logs.length}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </Paper>
          )}
        </>
      )}

      {/* Templates Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          {Object.entries(templates).map(([key, content]) => (
            <Grid item xs={12} md={6} key={key}>
              <Card
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  height: '100%'
                }}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight={600}>
                      {key}
                    </Typography>
                    <Tooltip title="Edit Template">
                      <IconButton
                        size="small"
                        onClick={() => handleEditTemplate(key)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    sx={{
                      p: 2,
                      background: alpha(theme.palette.background.default, 0.5),
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    {content || 'No content'}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Template: {editingTemplate}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={8}
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            placeholder="Enter template content..."
            sx={{ mt: 2, fontFamily: 'monospace' }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Available variables: {'{{name}}'}, {'{{amount}}'}, {'{{dueDate}}'}, etc.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveTemplate}
            sx={{
              background: theme.palette.primary.main
            }}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SmsLogs;
