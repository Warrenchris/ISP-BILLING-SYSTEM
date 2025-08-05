/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, CircularProgress, Avatar, Tooltip,
  Grid, FormControl, InputLabel, Select, LinearProgress, Divider,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  Add, Edit, Delete, Person, Search, Refresh, AdminPanelSettings,
  Block, CheckCircle, SupervisorAccount, Email, DataUsage,
  Pause, PlayArrow, Cancel, Payment, Key, Security,
  Warning, Phone, Router, CalendarToday, Info, 
  AccountCircle, Lock, Public, Speed
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { formatDate, getStatusColor } from '../utils/helpers';
import { USER_ROLES } from '../utils/constants';

const emptyUser = {
  firstName: '', lastName: '', email: '', phoneNumber: '',
  routerIp: '', role: 'customer', status: 'active',
  password: '', confirm: ''
};
const MIN_LEN = 8;

export default function AdminUsers() {
  const { adminApi } = useApi();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);
  const [filters, setFilters] = useState({
    role: 'all',
    status: 'all',
    subscriptionStatus: 'all'
  });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    admins: 0,
    withActiveSubscriptions: 0
  });

  // Subscription management state
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUserSubscriptions, setSelectedUserSubscriptions] = useState([]);
  const [selectedUserForSubscriptions, setSelectedUserForSubscriptions] = useState(null);
  const [subscriptionActionLoading, setSubscriptionActionLoading] = useState(false);

  // User management state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(emptyUser);
  
  // User details state
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);

  const showAlert = (message, severity = 'info') => {
    setAlert({ message, severity });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminApi.users.getAll({ 
        search,
        role: filters.role !== 'all' ? filters.role : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        subscriptionStatus: filters.subscriptionStatus !== 'all' ? filters.subscriptionStatus : undefined
      });
      
      const userData = response.data?.data?.users || [];
      setUsers(userData);
      
      setUserStats({
        total: userData.length,
        active: userData.filter(u => u.status === 'active').length,
        inactive: userData.filter(u => u.status === 'inactive').length,
        suspended: userData.filter(u => u.status === 'suspended').length,
        admins: userData.filter(u => u.role === 'admin').length,
        withActiveSubscriptions: userData.filter(u => u.activeSubscription?.status === 'active').length
      });
    } catch (error) {
      console.error('Failed to load users:', error);
      showAlert('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSubscriptions = async (userId) => {
  try {
    setSubscriptionActionLoading(true);
    const response = await adminApi.users.getUserSubscription(userId);
    
    // Make sure we're using the correct data path
    const subscriptions = response.data?.data?.subscriptions || [];
    setSelectedUserSubscriptions(subscriptions);
    setSubscriptionDialogOpen(true);
  } catch (error) {
    console.error('Failed to load subscriptions:', error);
    showAlert('Failed to load subscriptions', 'error');
  } finally {
    setSubscriptionActionLoading(false);
  }
};

  const handleSubscriptionAction = async (subscriptionId, action) => {
    try {
      setSubscriptionActionLoading(true);
      await adminApi.users.update(subscriptionId, { action });
      showAlert(`Subscription ${action}d successfully`, 'success');
      if (selectedUserForSubscriptions) {
        await loadUserSubscriptions(selectedUserForSubscriptions.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} subscription:`, error);
      showAlert(`Failed to ${action} subscription`, 'error');
    } finally {
      setSubscriptionActionLoading(false);
    }
  };

  const saveUser = async () => {
  try {
    if (!currentUser.id) {
      // 🔧 Validate password match
      if (currentUser.password !== currentUser.confirm) {
        showAlert('Passwords do not match', 'warning');
        return;
      }

      if (currentUser.password.length < MIN_LEN) {
        showAlert(`Password must be at least ${MIN_LEN} characters`, 'warning');
        return;
      }

      const { confirm, ...payload } = currentUser;

      const response = await adminApi.users.create(payload);
      
      showAlert('User created successfully', 'success');
      setUserDialogOpen(false);
      await loadUsers();
    } else {
      // Existing user update
      const { password, confirm, ...payload } = currentUser;
      const response = await adminApi.users.update(currentUser.id, payload);

      if (response.data?.code === 'USER_NOT_FOUND') {
        showAlert('User not found - refreshing list...', 'warning');
        await loadUsers();
        setUserDialogOpen(false);
        return;
      }

      if (response.data?.code === 'USER_DELETED') {
        showAlert(`User was deleted on ${new Date(response.data.deletedAt).toLocaleString()}`, 'error');
        await loadUsers();
        setUserDialogOpen(false);
        return;
      }

      showAlert('User updated successfully', 'success');
      setUserDialogOpen(false);
      await loadUsers();
    }
  } catch (error) {
    let errorMessage = 'Failed to save user';
    let severity = 'error';
    
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        errorMessage = data?.message || 'Invalid request data';
      } else if (status === 404) {
        errorMessage = data?.message || 'User not found';
        severity = 'warning';
      } else if (status === 409) {
        errorMessage = 'Email already exists';
      }
    }

    showAlert(errorMessage, severity);
  }
};


// Add auto-refresh when dialogs are open
useEffect(() => {
  const interval = setInterval(() => {
    if (userDialogOpen || userDetailsOpen) {
      loadUsers();
    }
  }, 30000); // Refresh every 30 seconds
  return () => clearInterval(interval);
}, [userDialogOpen, userDetailsOpen]);
  const deleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminApi.users.delete(id);
      showAlert('User deleted successfully', 'success');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      showAlert('Failed to delete user', 'error');
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      showAlert('No users selected', 'warning');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action} ${selectedUsers.length} user(s)?`)) return;

    try {
      await Promise.all(selectedUsers.map(userId => {
        switch (action) {
          case 'activate': return adminApi.users.update(userId, { status: 'active' });
          case 'suspend': return adminApi.users.update(userId, { status: 'suspended' });
          case 'delete': return adminApi.users.delete(userId);
          case 'makeAdmin': return adminApi.users.update(userId, { role: 'admin' });
          default: return Promise.resolve();
        }
      }));
      const results = await Promise.allSettled(
      selectedUsers.map(userId => 
        adminApi.users.update(
          userId,
          action === 'makeAdmin'
            ? { role: 'admin' }
            : { status: action }
        )
      )
    );

    // Handle partial successes
    const failedUpdates = results.filter(r => r.status === 'rejected');
    if (failedUpdates.length > 0) {
      console.error('Failed updates:', failedUpdates);
      showAlert(
        `Completed with ${failedUpdates.length} failures`,
        'warning'
      );
    } else {
      showAlert(`Bulk ${action} completed successfully`, 'success');
    }

      setSelectedUsers([]);
      await loadUsers();
    } catch (error) {
      console.error('Bulk action failed:', error);
      showAlert(`Bulk ${action} failed`, 'error');
    }
  };

  const handleEditClick = async (user) => {
  try {
    // Verify user still exists
    const response = await adminApi.users.getById(user.id);
    if (!response.data?.success) {
      showAlert('User no longer exists', 'warning');
      await loadUsers();
      return;
    }
    
    setCurrentUser({ ...user, password: '', confirm: '' });
    setUserDialogOpen(true);
  } catch (error) {
    showAlert('Failed to verify user status', 'error');
    await loadUsers();
  }
};

  const handleUserClick = (user) => {
    setSelectedUserDetails(user);
    setUserDetailsOpen(true);
  };

  useEffect(() => { loadUsers(); }, [search, filters]);

  const getSubscriptionStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'pending': return 'warning';
      case 'suspended': return 'secondary';
      default: return 'default';
    }
  };

  const getUserInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const filteredUsers = users.filter(user => {
    if (filters.role !== 'all' && user.role !== filters.role) return false;
    if (filters.status !== 'all' && user.status !== filters.status) return false;
    if (filters.subscriptionStatus !== 'all') {
      const subStatus = user.activeSubscription?.status || 'none';
      if (subStatus !== filters.subscriptionStatus) return false;
    }
    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">Admin User Management</Typography>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          onClick={() => {
            setCurrentUser(emptyUser);
            setUserDialogOpen(true);
          }}
        >
          Add User
        </Button>
      </Box>

      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        {Object.entries(userStats).map(([key, value]) => (
          <Grid item xs={12} sm={6} md={2} key={key}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ 
                    bgcolor: key === 'total' ? 'primary.main' : 
                             key === 'active' ? 'success.main' : 
                             key === 'inactive' ? 'warning.main' : 
                             key === 'suspended' ? 'error.main' : 
                             key === 'admins' ? 'secondary.main' : 'info.main',
                    mr: 1, 
                    width: 32, 
                    height: 32 
                  }}>
                    {key === 'total' ? <Person fontSize="small" /> :
                     key === 'active' ? <CheckCircle fontSize="small" /> :
                     key === 'inactive' ? <Warning fontSize="small" /> :
                     key === 'suspended' ? <Block fontSize="small" /> :
                     key === 'admins' ? <SupervisorAccount fontSize="small" /> :
                     <DataUsage fontSize="small" />}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{value}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase())}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Search users"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Role</InputLabel>
                <Select
                  value={filters.role}
                  onChange={(e) => setFilters({...filters, role: e.target.value})}
                  label="Role"
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="support">Support</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Subscription</InputLabel>
                <Select
                  value={filters.subscriptionStatus}
                  onChange={(e) => setFilters({...filters, subscriptionStatus: e.target.value})}
                  label="Subscription"
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="none">None</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadUsers}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Subscription</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow 
                      key={user.id} 
                      hover
                      onClick={() => handleUserClick(user)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar>{getUserInitials(user.firstName, user.lastName)}</Avatar>
                          <Box>
                            <Typography fontWeight="500">
                              {user.firstName} {user.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {user.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography>{user.email}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.phoneNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status}
                          color={getStatusColor(user.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {user.activeSubscription ? (
                          <Box>
                            <Typography variant="body2">
                              {user.activeSubscription?.plan?.name || 
                                user.activeSubscription?.DataPlan?.name || 
                                'No active plan'}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                              <Chip
                                label={user.activeSubscription.status}
                                color={getSubscriptionStatusColor(user.activeSubscription.status)}
                                size="small"
                              />
                              {user.activeSubscription.daysRemaining !== undefined && (
                                <Typography variant="caption">
                                  {user.activeSubscription.daysRemaining} days left
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No active subscription
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          <Tooltip title="Manage Subscriptions">
                            <IconButton
                              color="info"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserForSubscriptions(user);
                                loadUserSubscriptions(user.id);
                              }}
                            >
                              <DataUsage />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit User">
                            <IconButton
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentUser({ ...user, password: '', confirm: '' });
                                setUserDialogOpen(true);
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUser(user.id);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Box py={4}>
                        <Person sx={{ fontSize: 48, color: 'text.secondary' }} />
                        <Typography>No users found</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ width: 56, height: 56, fontSize: 24 }}>
              {selectedUserDetails && getUserInitials(
                selectedUserDetails.firstName, 
                selectedUserDetails.lastName
              )}
            </Avatar>
            <Box>
              <Typography variant="h5">
                {selectedUserDetails?.firstName} {selectedUserDetails?.lastName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {selectedUserDetails?.role}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountCircle sx={{ mr: 1 }} /> Basic Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Email />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Email" 
                        secondary={selectedUserDetails?.email || 'N/A'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Phone />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Phone" 
                        secondary={selectedUserDetails?.phoneNumber || 'N/A'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CalendarToday />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Joined" 
                        secondary={formatDate(selectedUserDetails?.createdAt) || 'N/A'} 
                      />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <Router sx={{ mr: 1 }} /> Network Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Public />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Router IP" 
                        secondary={selectedUserDetails?.routerIp || 'N/A'} 
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Speed />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Last Active" 
                        secondary={selectedUserDetails?.lastLogin ? formatDate(selectedUserDetails.lastLogin) : 'Never'} 
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <DataUsage sx={{ mr: 1 }} /> Subscription Information
              </Typography>
              {selectedUserDetails?.activeSubscription ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Plan Name" 
                          secondary={selectedUserDetails.activeSubscription.DataPlan?.name || 'N/A'} 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Status" 
                          secondary={
                            <Chip 
                              label={selectedUserDetails.activeSubscription.status} 
                              color={getSubscriptionStatusColor(selectedUserDetails.activeSubscription.status)}
                              size="small"
                            />
                          } 
                        />
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Data Usage" 
                          secondary={
                            <Box display="flex" alignItems="center" gap={2}>
                              <Box width="100%">
                                <LinearProgress
                                  variant="determinate"
                                  value={
                                    (selectedUserDetails.activeSubscription.dataUsed / 
                                    selectedUserDetails.activeSubscription.DataPlan?.dataLimit) * 100 || 0
                                  }
                                  sx={{ height: 8 }}
                                />
                              </Box>
                              <Typography variant="body2">
                                {Math.round(
                                  (selectedUserDetails.activeSubscription.dataUsed / 
                                  selectedUserDetails.activeSubscription.DataPlan?.dataLimit) * 100
                                )}%
                              </Typography>
                            </Box>
                          } 
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Expires" 
                          secondary={formatDate(selectedUserDetails.activeSubscription.endDate) || 'N/A'} 
                        />
                      </ListItem>
                    </List>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No active subscription</Alert>
              )}
            </CardContent>
          </Card>
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<Edit />}
            onClick={() => {
              setCurrentUser({ ...selectedUserDetails, password: '', confirm: '' });
              setUserDetailsOpen(false);
              setUserDialogOpen(true);
            }}
          >
            Edit User
          </Button>
          <Button 
            onClick={() => setUserDetailsOpen(false)}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subscription Management Dialog */}
      <Dialog
        open={subscriptionDialogOpen}
        onClose={() => setSubscriptionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar>
              {selectedUserForSubscriptions && 
                getUserInitials(
                  selectedUserForSubscriptions.firstName, 
                  selectedUserForSubscriptions.lastName
                )
              }
            </Avatar>
            <Box>
              <Typography variant="h6">
                {selectedUserForSubscriptions?.firstName} {selectedUserForSubscriptions?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedUserForSubscriptions?.email}
              </Typography>
            </Box>
          </Box>
          <Typography variant="subtitle1" mt={1}>
            Subscription Management
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Data Usage</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptionActionLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : selectedUserSubscriptions.length > 0 ? (
                  selectedUserSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <Typography fontWeight="500">{sub.DataPlan?.name}</Typography>
                        <Typography variant="caption">#{sub.subscriptionNumber}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status}
                          color={getSubscriptionStatusColor(sub.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box width="100px">
                            <LinearProgress
                              variant="determinate"
                              value={(sub.dataUsed / sub.DataPlan?.dataLimit) * 100 || 0}
                              color={
                                (sub.dataUsed / sub.DataPlan?.dataLimit) > 0.9 
                                  ? 'error' 
                                  : 'primary'
                              }
                            />
                          </Box>
                          <Typography variant="caption">
                            {Math.round((sub.dataUsed / sub.DataPlan?.dataLimit) * 100)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                        </Typography>
                        <Typography variant="caption">
                          {Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))} days left
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {sub.status === 'active' && (
                            <>
                              <Tooltip title="Suspend">
                                <IconButton
                                  size="small"
                                  color="warning"
                                  onClick={() => handleSubscriptionAction(sub.id, 'suspend')}
                                  disabled={subscriptionActionLoading}
                                >
                                  <Pause fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleSubscriptionAction(sub.id, 'cancel')}
                                  disabled={subscriptionActionLoading}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {sub.status === 'suspended' && (
                            <Tooltip title="Activate">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleSubscriptionAction(sub.id, 'activate')}
                                disabled={subscriptionActionLoading}
                              >
                                <PlayArrow fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No subscriptions found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubscriptionDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* User Edit/Create Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {currentUser.id ? 'Edit User' : 'Create User'}
        </DialogTitle>
        <DialogContent>
          <Box mt={2} display="grid" gap={2}>
            {['firstName', 'lastName', 'email', 'phoneNumber', 'routerIp'].map((field) => (
              <TextField
                key={field}
                label={field.replace(/([A-Z])/g, ' $1')}
                value={currentUser[field] || ''}
                onChange={(e) => setCurrentUser({ ...currentUser, [field]: e.target.value })}
                fullWidth
              />
            ))}
            {!currentUser.id && (
              <>
                <TextField
                  label="Password"
                  type="password"
                  value={currentUser.password}
                  onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  value={currentUser.confirm}
                  onChange={(e) => setCurrentUser({ ...currentUser, confirm: e.target.value })}
                  fullWidth
                />
              </>
            )}
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={currentUser.role}
                onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })}
                label="Role"
              >
                {Object.values(USER_ROLES).map((role) => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={currentUser.status}
                onChange={(e) => setCurrentUser({ ...currentUser, status: e.target.value })}
                label="Status"
              >
                {['active', 'inactive', 'suspended'].map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveUser}
            disabled={!currentUser.firstName || !currentUser.lastName || !currentUser.email}
          >
            {currentUser.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}