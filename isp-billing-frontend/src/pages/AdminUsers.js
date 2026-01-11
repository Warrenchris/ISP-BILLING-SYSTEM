/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react';
import { Box, Alert } from '@mui/material';
import { useApi } from '../contexts/ApiContext';
import UserStatsRow from '../components/users/UserStatsRow';
import UserFilterBar from '../components/users/UserFilterBar';
import UsersTable from '../components/users/UsersTable';
import UserDialog from '../components/users/UserDialog';
import UserDetailsDialog from '../components/users/UserDetailsDialog';
import UserSubscriptionsDialog from '../components/users/UserSubscriptionsDialog';


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
  // const [selectedUsers, setSelectedUsers] = useState([]);
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
        if (currentUser.password !== currentUser.confirm) {
          showAlert('Passwords do not match', 'warning');
          return;
        }

        if (currentUser.password.length < MIN_LEN) {
          showAlert(`Password must be at least ${MIN_LEN} characters`, 'warning');
          return;
        }

        const { confirm, ...payload } = currentUser;

        await adminApi.users.create(payload);

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
      {alert && (
        <Alert severity={alert.severity} sx={{ mb: 3 }}>
          {alert.message}
        </Alert>
      )}

      <UserStatsRow stats={userStats} />

      <UserFilterBar
        search={search}
        setSearch={setSearch}
        filters={filters}
        setFilters={setFilters}
        loading={loading}
        onRefresh={loadUsers}
        onAdd={() => {
          setCurrentUser(emptyUser);
          setUserDialogOpen(true);
        }}
      />

      <UsersTable
        users={filteredUsers}
        loading={loading}
        onUserClick={handleUserClick}
        onEdit={handleEditClick}
        onDelete={deleteUser}
        onManageSubscriptions={(user) => {
          setSelectedUserForSubscriptions(user);
          loadUserSubscriptions(user.id);
        }}
      />

      <UserDialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        user={currentUser}
        setUser={setCurrentUser}
        onSave={saveUser}
      />

      <UserDetailsDialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        user={selectedUserDetails}
        onEdit={(user) => {
          setCurrentUser({ ...user, password: '', confirm: '' });
          setUserDetailsOpen(false);
          setUserDialogOpen(true);
        }}
      />

      <UserSubscriptionsDialog
        open={subscriptionDialogOpen}
        onClose={() => setSubscriptionDialogOpen(false)}
        user={selectedUserForSubscriptions}
        subscriptions={selectedUserSubscriptions}
        loading={subscriptionActionLoading}
        onAction={handleSubscriptionAction}
      />
    </Box>
  );
}