import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, List, ListItem, ListItemText, ListItemAvatar,
    Avatar, Chip, Divider, LinearProgress, Alert
} from '@mui/material';
import {
    Sms as SmsIcon,
    Email as EmailIcon,
    Notifications as SystemIcon,
    CheckCircle, Error as ErrorIcon, AccessTime
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

const NotificationsLog = () => { // Renamed slightly to avoid clash if I import Notifications elsewhere or valid simple name
    const theme = useTheme();
    const { notificationService } = useApi();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                // Fetch notifications (admin view or user view depending on role)
                const response = isAdmin 
                    ? await notificationService.getAll()
                    : await notificationService.getMyNotifications();
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data : data.notifications || data.items || [];
                setNotifications(items);
            } catch (err) {
                console.error('Failed to load notifications:', err);
                setError('Failed to load notification log.');
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [isAdmin, notificationService]);

    const getIcon = (type) => {
        const t = (type || '').toLowerCase();
        switch (t) {
            case 'sms': return <SmsIcon />;
            case 'email': return <EmailIcon />;
            default: return <SystemIcon />;
        }
    };

    const getStatusIcon = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'sent' || s === 'delivered') return <CheckCircle fontSize="small" />;
        if (s === 'failed') return <ErrorIcon fontSize="small" />;
        return <AccessTime fontSize="small" />;
    };

    const getStatusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'sent' || s === 'delivered') return 'success';
        if (s === 'failed') return 'error';
        return 'warning';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 600, mb: 4 }}>Notifications Log</Typography>

            {loading ? <LinearProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <Paper sx={{ 
                    background: theme.palette.background.paper,
                    borderRadius: '16px',
                    border: `1px solid ${theme.palette.custom.borderDefault}`,
                    boxShadow: '0 4px 20px -2px rgba(43, 43, 43, 0.03)',
                    overflow: 'hidden'
                }}>
                    <List disablePadding>
                        {notifications.length === 0 ? (
                            <ListItem sx={{ py: 4, textAlign: 'center', justifyContent: 'center' }}>
                                <ListItemText 
                                    primary="No notifications found" 
                                    primaryTypographyProps={{ color: 'text.secondary', fontWeight: 500 }}
                                />
                            </ListItem>
                        ) : (
                            notifications.map((notif, index) => (
                                <React.Fragment key={notif.id || index}>
                                    <ListItem sx={{ py: 2, px: 3, '&:hover': { bgcolor: 'rgba(28, 25, 23, 0.02)' } }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ 
                                                bgcolor: alpha(theme.palette.primary.main, 0.15), 
                                                color: theme.palette.primary.dark,
                                                fontWeight: 600
                                            }}>
                                                {getIcon(notif.type)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                    <Typography fontWeight="600" sx={{ fontSize: '0.95rem' }}>
                                                        {(notif.type || 'System').toUpperCase()} to {notif.recipient || notif.to || 'User'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : (notif.time || 'N/A')}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.9 }}>
                                                    {notif.message}
                                                </Typography>
                                            }
                                        />
                                        <Box ml={2}>
                                            <Chip
                                                label={notif.status || 'Sent'}
                                                color={getStatusColor(notif.status)}
                                                size="small"
                                                icon={getStatusIcon(notif.status)}
                                                variant="outlined"
                                                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                                            />
                                        </Box>
                                    </ListItem>
                                    {index < notifications.length - 1 && <Divider component="li" />}
                                </React.Fragment>
                            ))
                        )}
                    </List>
                </Paper>
            )}
        </Box>
    );
};

export default NotificationsLog;
