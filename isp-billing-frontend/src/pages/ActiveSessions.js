import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Button, Tabs, Tab, Checkbox,
  TextField, InputAdornment, Menu, MenuItem, TablePagination, Alert, Snackbar,
  CircularProgress, Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  PowerSettingsNew as DisconnectIcon,
  WifiTethering as LiveIcon,
  Router as RouterIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { getRelativeTime, formatDateTime } from '../utils/helpers';
import { adminApi } from '../utils/api';

const ActiveSessions = () => {
  const theme = useTheme();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [counts, setCounts] = useState({ all: 0, hotspot: 0, pppoe: 0, withoutExpiry: 0 });
  const [totalItems, setTotalItems] = useState(0);

  const [selectedIds, setSelectedIds] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchSessions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await adminApi.sessions.getActive({
        tab,
        search,
        page: page + 1,
        limit
      });
      if (response.data?.success) {
        const { sessions: fetchedSessions, counts: fetchedCounts, pagination } = response.data.data;
        setSessions(fetchedSessions || []);
        setCounts(fetchedCounts || { all: 0, hotspot: 0, pppoe: 0, withoutExpiry: 0 });
        setTotalItems(pagination?.totalItems || 0);
      }
    } catch (err) {
      console.error('Failed to fetch active sessions:', err);
      setSnackbar({ open: true, message: 'Failed to load active sessions', severity: 'error' });
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [tab, search, page, limit]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 30 seconds (QueueHealth polling pattern)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSessions(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleTabChange = (event, newTab) => {
    setTab(newTab);
    setPage(0);
    setSelectedIds([]);
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const ids = sessions.map(s => s.subscriptionId).filter(Boolean);
      setSelectedIds(ids);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (subscriptionId) => {
    if (!subscriptionId) return;
    setSelectedIds(prev =>
      prev.includes(subscriptionId)
        ? prev.filter(id => id !== subscriptionId)
        : [...prev, subscriptionId]
    );
  };

  const handleMenuOpen = (e, session) => {
    setAnchorEl(e.currentTarget);
    setActiveSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveSession(null);
  };

  const handleDisconnect = async (ids) => {
    if (!ids || ids.length === 0) return;
    setDisconnecting(true);
    try {
      const response = await adminApi.sessions.disconnect({ subscriptionIds: ids });
      if (response.data?.success) {
        setSnackbar({
          open: true,
          message: `Enqueued ${response.data.data?.queuedCount || ids.length} session termination job(s) in provisioning queue`,
          severity: 'success'
        });
        setSelectedIds([]);
        fetchSessions();
      } else {
        throw new Error(response.data?.message || 'Failed to disconnect session');
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to terminate session', severity: 'error' });
    } finally {
      setDisconnecting(false);
      handleMenuClose();
    }
  };

  const formatRelativeTime = (dateStr, fallback = ' — ') => {
    if (!dateStr) return fallback;
    return getRelativeTime(dateStr);
  };

  return (
    <Box p={3}>
      {/* Top Title Banner */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              Active Sessions
            </Typography>
            <Chip
              icon={<LiveIcon sx={{ fontSize: '14px !important', color: `${theme.palette.success.main} !important` }} />}
              label="LIVE 30s Poll"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '11px' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Real-time operational view of connected sessions across PPPoE, Hotspot, and address-list customers
          </Typography>
        </Box>

        <Box display="flex" gap={1.5}>
          {selectedIds.length > 0 && (
            <Button
              variant="contained"
              color="error"
              startIcon={disconnecting ? <CircularProgress size={16} color="inherit" /> : <DisconnectIcon />}
              onClick={() => handleDisconnect(selectedIds)}
              disabled={disconnecting}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Terminate Selected ({selectedIds.length})
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchSessions()}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Filter Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{
            px: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.9rem' }
          }}
        >
          <Tab value="all" label={`All (${counts.all})`} />
          <Tab value="hotspot" label={`Hotspot (${counts.hotspot})`} />
          <Tab value="pppoe" label={`PPPoE (${counts.pppoe})`} />
          <Tab value="without_expiry" label={`Without Expiry (${counts.withoutExpiry})`} />
        </Tabs>

        {/* Search Bar */}
        <Box p={2}>
          <TextField
            fullWidth
            placeholder="Search active sessions by username, account ID, IP, MAC, or router..."
            value={search}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              )
            }}
            size="small"
          />
        </Box>

        {/* Sessions Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.length > 0 && selectedIds.length < sessions.length}
                    checked={sessions.length > 0 && selectedIds.length === sessions.map(s => s.subscriptionId).filter(Boolean).length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 500 }}>Username / Account ID</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>IP Address</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>MAC Address</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>Router</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>Session Start</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>Session End</TableCell>
                <TableCell align="right" sx={{ fontWeight: 500 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Fetching live session state...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
                      No active sessions connected
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      There are currently no active RADIUS or broadband connections matching this filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map(s => {
                  const isSelected = selectedIds.includes(s.subscriptionId);
                  return (
                    <TableRow key={s.id} hover selected={isSelected}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          disabled={!s.subscriptionId}
                          onChange={() => handleSelectOne(s.subscriptionId)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700} color="text.primary">
                          {s.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ID: {s.accountId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.connectionType.toUpperCase()}
                          size="small"
                          color={s.connectionType === 'pppoe' ? 'primary' : s.connectionType === 'hotspot' ? 'warning' : 'info'}
                          sx={{ fontWeight: 500, fontSize: '10px' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" fontWeight={600}>
                          {s.ipAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace" color={s.macAddress === ' — ' ? 'text.disabled' : 'text.primary'}>
                          {s.macAddress}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <RouterIcon fontSize="small" color="action" />
                          <Typography variant="body2">{s.routerName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={s.sessionStart ? formatDateTime(s.sessionStart) : ''}>
                          <Typography variant="body2">
                            {formatRelativeTime(s.sessionStart)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {s.isWithoutExpiry ? (
                          <Chip label="Without Expiry" size="small" variant="outlined" sx={{ fontSize: '11px', fontWeight: 600 }} />
                        ) : (
                          <Tooltip title={s.sessionEnd ? formatDateTime(s.sessionEnd) : ''}>
                            <Typography variant="body2" color={s.sessionEnd && new Date(s.sessionEnd) < new Date() ? 'error.main' : 'text.primary'}>
                              {formatRelativeTime(s.sessionEnd, 'Without Expiry')}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => handleMenuOpen(e, s)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Controls */}
        <TablePagination
          component="div"
          count={totalItems}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => {
            setLimit(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>

      {/* Row Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => activeSession?.subscriptionId && handleDisconnect([activeSession.subscriptionId])}
          disabled={!activeSession?.subscriptionId || disconnecting}
          sx={{ color: 'error.main', fontWeight: 600 }}
        >
          <DisconnectIcon fontSize="small" sx={{ mr: 1 }} />
          Terminate Session
        </MenuItem>
      </Menu>

      {/* Feedback Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ActiveSessions;
