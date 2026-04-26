import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Button, Menu, MenuItem,
    Avatar, TextField, InputAdornment, LinearProgress, Alert, Snackbar
} from '@mui/material';
import {
    Search as SearchIcon,
    MoreVert as MoreVertIcon,
    Visibility as ViewIcon,
    Edit as EditIcon,
    Block as BlockIcon,
    Add as AddIcon,
    FilterList as FilterListIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../contexts/ApiContext';
import usePaginatedFetch from '../hooks/usePaginatedFetch';
import { TablePagination } from '@mui/material';
import UserDialog from '../components/users/UserDialog';

const emptyUser = {
  firstName: '', lastName: '', email: '', phoneNumber: '',
  routerIp: '', role: 'customer', status: 'active',
  password: '', confirm: ''
};
const MIN_LEN = 8;

const UsersManagement = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { adminApi } = useApi();
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [userDialogOpen, setUserDialogOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(emptyUser);

    // Use the new hook
    // Note: adminApi.users.getAll must accept { page, limit, search }
    const {
        data: users,
        loading,
        error,
        page,
        limit,
        total,
        setPage,
        setLimit,
        setParams,
        refresh
    } = usePaginatedFetch(adminApi.users.getAll, 1, 10);

    // Debounce search update
    useEffect(() => {
        const timer = setTimeout(() => {
            setParams({ search: searchTerm });
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, setParams]);

    const handleMenuClick = (event, user) => {
        setAnchorEl(event.currentTarget);
        setSelectedUser(user);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedUser(null);
    };

    const handleView = () => {
        if (selectedUser) navigate(`/users/${selectedUser.id}`);
        handleMenuClose();
    };

    const handleSuspend = async () => {
        if (!selectedUser) return;
        try {
            await adminApi.users.suspend(selectedUser.id);
            setSnackbar({ open: true, message: `User ${selectedUser.name} suspended successfully`, severity: 'success' });
            refresh(); // Use hook's refresh
        } catch (err) {
            setSnackbar({ open: true, message: 'Failed to suspend user', severity: 'error' });
        }
        handleMenuClose();
    };

    const handleEditClick = async () => {
        handleMenuClose();
        if (!selectedUser) return;
        try {
            const response = await adminApi.users.getById(selectedUser.id);
            if (!response.data?.success) {
                setSnackbar({ open: true, message: 'User no longer exists', severity: 'warning' });
                refresh();
                return;
            }
            setCurrentUser({ ...selectedUser, password: '', confirm: '' });
            setUserDialogOpen(true);
        } catch (error) {
            setSnackbar({ open: true, message: 'Failed to verify user status', severity: 'error' });
            refresh();
        }
    };

    const saveUser = async () => {
        try {
            if (!currentUser.id) {
                if (currentUser.password !== currentUser.confirm) {
                    setSnackbar({ open: true, message: 'Passwords do not match', severity: 'warning' });
                    return;
                }
                if (currentUser.password.length < MIN_LEN) {
                    setSnackbar({ open: true, message: `Password must be at least ${MIN_LEN} characters`, severity: 'warning' });
                    return;
                }
                const { confirm, ...payload } = currentUser;
                await adminApi.users.create(payload);
                setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
                setUserDialogOpen(false);
                refresh();
            } else {
                const { password, confirm, ...payload } = currentUser;
                await adminApi.users.update(currentUser.id, payload);
                setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
                setUserDialogOpen(false);
                refresh();
            }
        } catch (error) {
            let errorMessage = 'Failed to save user';
            let severity = 'error';
            if (error.response) {
                const { status, data } = error.response;
                if (status === 400) errorMessage = data?.message || 'Invalid request data';
                else if (status === 404) { errorMessage = data?.message || 'User not found'; severity = 'warning'; }
                else if (status === 409) errorMessage = 'Email already exists';
            }
            setSnackbar({ open: true, message: errorMessage, severity });
        }
    };

    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

    // Filter locally is removed as we now rely on backend search via hook
    const filteredUsers = users;

    const getStatusColor = (status) => {
        const normalized = (status || '').toLowerCase();
        if (normalized === 'active') return theme.palette.success.main;
        if (normalized === 'suspended' || normalized === 'inactive') return theme.palette.error.main;
        if (normalized === 'expired') return theme.palette.warning.main;
        return theme.palette.text.secondary;
    };

    if (loading && users.length === 0) {
        return <LinearProgress color="primary" />;
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
                <Button onClick={refresh} sx={{ mt: 2 }}>Retry</Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h3" sx={{
                        fontWeight: 700,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1
                    }}>
                        Users Management
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your customer base, subscriptions, and statuses
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{
                        
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'primary.contrastText',
                        fontWeight: 600
                    }}
                    onClick={() => {
                        setCurrentUser(emptyUser);
                        setUserDialogOpen(true);
                    }}
                >
                    Add New User
                </Button>
            </Box>

            {/* Filters */}
            <Paper sx={{
                p: 2, mb: 3, 
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`
            }}>
                <Box display="flex" gap={2}>
                    <TextField
                        fullWidth
                        placeholder="Search users by name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                            sx: { }
                        }}
                        variant="outlined"
                        size="small"
                    />
                    <Button
                        variant="outlined"
                        startIcon={<FilterListIcon />}
                        sx={{  whiteSpace: 'nowrap' }}
                    >
                        Filters
                    </Button>
                </Box>
            </Paper>

            {/* Users Table */}
            <TableContainer component={Paper} sx={{
                
                background: alpha(theme.palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`
            }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Contact</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Joined</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography py={3} color="text.secondary">No users found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar sx={{ bgcolor: theme.palette.primary.main, color: 'primary.contrastText' }}>
                                                {user.name?.charAt(0) || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="600">{user.name || 'Unknown'}</Typography>
                                                <Typography variant="caption" color="text.secondary">ID: {user.id}</Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{user.email}</Typography>
                                        <Typography variant="caption" color="text.secondary">{user.phone}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.plan || user.subscription?.plan?.name || 'No Plan'}
                                            size="small"
                                            sx={{
                                                
                                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                                color: theme.palette.info.main,
                                                fontWeight: 600
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.status || 'Unknown'}
                                            size="small"
                                            sx={{
                                                
                                                bgcolor: alpha(getStatusColor(user.status), 0.1),
                                                color: getStatusColor(user.status),
                                                fontWeight: 600,
                                                border: `1px solid ${alpha(getStatusColor(user.status), 0.2)}`
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={(e) => handleMenuClick(e, user)}>
                                            <MoreVertIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <TablePagination
                component="div"
                count={total}
                page={page - 1} // API is 1-indexed, MUI is 0-indexed
                onPageChange={(e, p) => setPage(p + 1)}
                rowsPerPage={limit}
                onRowsPerPageChange={(e) => setLimit(parseInt(e.target.value, 10))}
                rowsPerPageOptions={[5, 10, 25]}
            />

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                    sx: {
                        
                        mt: 1,
                        background: alpha(theme.palette.background.paper, 0.9),
                        backdropFilter: 'blur(10px)',
                        border: `1px solid ${theme.palette.divider}`
                    }
                }}
            >
                <MenuItem onClick={handleView}>
                    <ViewIcon fontSize="small" sx={{ mr: 1 }} /> View Details
                </MenuItem>
                <MenuItem onClick={handleEditClick}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit User
                </MenuItem>
                <MenuItem onClick={handleSuspend} sx={{ color: theme.palette.error.main }}>
                    <BlockIcon fontSize="small" sx={{ mr: 1 }} /> Suspend
                </MenuItem>
            </Menu>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <UserDialog
                open={userDialogOpen}
                onClose={() => setUserDialogOpen(false)}
                user={currentUser}
                setUser={setCurrentUser}
                onSave={saveUser}
            />
        </Box>
    );
};

export default UsersManagement;
