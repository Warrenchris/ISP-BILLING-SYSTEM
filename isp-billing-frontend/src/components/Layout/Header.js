import React, { useState, useEffect } from 'react';
import {
    Menu as MenuIcon,
    MenuOpen as MenuOpenIcon,
    ChevronRight as ChevronRightIcon,
    NotificationsOutlined as BellIcon,
    SettingsOutlined as SettingsIcon,
    Search as SearchIcon,
    KeyboardArrowDown as ArrowDownIcon,
    LogoutOutlined as LogoutIcon,
    AccountCircleOutlined as ProfileIcon } from '@mui/icons-material';
import {
    IconButton, Avatar, Badge, Menu, MenuItem,
    Divider, Typography, Box, Tooltip } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '../../contexts/ApiContext';
import { useNavigate, useLocation } from 'react-router-dom';
import GlobalSearchModal from '../common/GlobalSearchModal';

/* ─── Page title map ─────────────────────────────────────────────────────── */
const PAGE_META = {
    '/dashboard':      { title: 'Dashboard',         sub: 'Your command center'              },
    '/users':          { title: 'User Management',   sub: 'Manage all registered users'      },
    '/subscriptions':  { title: 'Subscriptions',     sub: 'Plans & subscription status'      },
    '/data-plans':     { title: 'Data Plans',         sub: 'Configure ISP packages'           },
    '/payments':       { title: 'Payments',           sub: 'Transaction history & tracking'   },
    '/invoices':       { title: 'Invoices',           sub: 'Billing documents'                },
    '/data-usage':     { title: 'Data Usage',         sub: 'Bandwidth & usage analytics'      },
    '/profile':        { title: 'My Profile',         sub: 'Account details & preferences'    },
    '/tickets':        { title: 'Support Tickets',   sub: 'Manage customer support requests'  },
    '/notifications':  { title: 'Notifications',     sub: 'Alerts & system messages'          },
    '/reports':        { title: 'Reports',            sub: 'Analytics & insights'              },
    '/staff':          { title: 'Staff & Roles',      sub: 'Team management'                  },
    '/audit-logs':     { title: 'Audit Logs',         sub: 'System activity trail'             },
    '/settings':       { title: 'Settings',           sub: 'System configuration'              },
    '/ai-dashboard':   { title: 'AI Dashboard',       sub: 'Intelligence & predictions'        },
    '/network-devices':{ title: 'Network Devices',    sub: 'Router & device management'        },
    '/vouchers':       { title: 'Vouchers',           sub: 'Access code management'            },
    '/sms-logs':       { title: 'SMS Logs',           sub: 'Message delivery tracking'         },
    '/queue-health':   { title: 'Queue Health',       sub: 'System job monitoring'             },
    '/active-sessions':{ title: 'Active Sessions',    sub: 'Live user connections'             },
};

function usePageMeta() {
    const { pathname } = useLocation();
    if (PAGE_META[pathname]) return PAGE_META[pathname];
    const key = Object.keys(PAGE_META).find(k => k !== '/' && pathname.startsWith(k));
    return PAGE_META[key] || { title: 'ISP Billing', sub: 'Welcome back' };
}

/* ─── Header Component ─────────────────────────────────────────────────────── */
const Header = ({ onMenuClick, collapsed, onToggleCollapse }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { title, sub } = usePageMeta();

    const [anchorEl, setAnchorEl]     = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    
    const { notificationService } = useApi();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = user?.role === 'admin' 
                    ? await notificationService.getAll()
                    : await notificationService.getMyNotifications();
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data : data.notifications || data.items || [];
                const unread = items.filter(n => n.status !== 'read' && !n.isRead && !n.read).length;
                setUnreadCount(unread);
            } catch (e) {
                console.error("Failed to load notifications count", e);
            }
        };
        if (user) fetchNotifications();
    }, [notificationService, user]);

    const displayName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
    const initials    = displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

    const handleMenuOpen  = (e) => setAnchorEl(e.currentTarget);
    const handleMenuClose = ()  => setAnchorEl(null);

    const handleLogout = () => {
        handleMenuClose();
        logout();
        navigate('/login');
    };

    return (
        <Box
            component="header"
            role="banner"
            sx={{
                position: 'sticky',
                top: 0,
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: '56px',
                px: { xs: 2, md: 3 },
                mx: { xs: 0, md: 1 },
                mt: { xs: 0, md: 1.5 },
                mb: { xs: 0, md: 0 },
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: { xs: 0, md: '16px' },
                border: { xs: 'none', md: '1px solid rgba(28, 25, 23, 0.06)' },
                boxShadow: { xs: 'none', md: '0 1px 3px rgba(0, 0, 0, 0.02)' },
            }}
        >
            {/* ── Left: hamburger + page title ── */}
            <Box display="flex" alignItems="center" gap={1.5}>
                {/* Mobile hamburger */}
                <IconButton
                    onClick={onMenuClick}
                    aria-label="Open navigation menu"
                    sx={{
                        display: { md: 'none' },
                        color: '#1C1917',
                        '&:hover': { bgcolor: 'rgba(28, 25, 23, 0.04)' },
                    }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Desktop sidebar collapse toggle */}
                {onToggleCollapse && (
                    <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} arrow>
                        <IconButton
                            onClick={onToggleCollapse}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            sx={{
                                display: { xs: 'none', md: 'inline-flex' },
                                color: '#78716C',
                                transition: 'all 0.15s ease-out',
                                '&:hover': { bgcolor: 'rgba(28, 25, 23, 0.04)', color: '#1C1917' },
                            }}
                        >
                            {collapsed ? <ChevronRightIcon /> : <MenuOpenIcon />}
                        </IconButton>
                    </Tooltip>
                )}

                {/* Page title */}
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 600,
                            fontSize: { xs: '0.9375rem', md: '1rem' },
                            color: '#1C1917',
                            lineHeight: 1.2,
                            letterSpacing: '-0.01em',
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography
                        sx={{
                            display: { xs: 'none', sm: 'block' },
                            fontSize: '0.75rem',
                            color: '#A8A29E',
                            mt: '1px',
                            lineHeight: 1,
                        }}
                    >
                        {sub}
                    </Typography>
                </Box>
            </Box>

            {/* ── Right: search + actions ── */}
            <Box display="flex" alignItems="center" gap={{ xs: 0.5, md: 1 }}>

                {/* Search trigger (desktop) */}
                <Box
                    onClick={() => setSearchOpen(true)}
                    role="button"
                    tabIndex={0}
                    aria-label="Open search"
                    onKeyDown={(e) => { if (e.key === 'Enter') setSearchOpen(true); }}
                    sx={{
                        display: { xs: 'none', md: 'flex' },
                        alignItems: 'center',
                        gap: 1,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: 'rgba(28, 25, 23, 0.03)',
                        border: '1px solid rgba(28, 25, 23, 0.06)',
                        transition: 'all 0.15s ease-out',
                        width: 200,
                        '&:hover': {
                            background: 'rgba(28, 25, 23, 0.05)',
                            borderColor: 'rgba(28, 25, 23, 0.1)',
                        },
                    }}
                >
                    <SearchIcon sx={{ color: '#A8A29E', fontSize: 16 }} />
                    <Typography sx={{ flex: 1, fontSize: '0.8125rem', color: '#A8A29E' }}>
                        Search…
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: '0.625rem',
                            color: '#A8A29E',
                            border: '1px solid rgba(28, 25, 23, 0.1)',
                            borderRadius: '4px',
                            px: 0.5,
                            py: '1px',
                            fontFamily: 'monospace',
                        }}
                    >
                        ⌘K
                    </Typography>
                </Box>

                {/* Mobile search */}
                <IconButton
                    onClick={() => setSearchOpen(true)}
                    aria-label="Open search"
                    sx={{
                        display: { xs: 'inline-flex', md: 'none' },
                        color: '#78716C',
                    }}
                >
                    <SearchIcon sx={{ fontSize: 20 }} />
                </IconButton>

                {/* Notification bell */}
                <Tooltip title="Notifications" arrow>
                    <IconButton
                        onClick={() => navigate('/notifications')}
                        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                        sx={{
                            color: '#78716C',
                            transition: 'color 0.15s ease-out',
                            '&:hover': { color: '#1C1917' },
                        }}
                    >
                        <Badge
                            badgeContent={unreadCount}
                            sx={{
                                '& .MuiBadge-badge': {
                                    bgcolor: '#DC2626',
                                    color: '#FFFFFF',
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                    minWidth: 16,
                                    height: 16,
                                },
                            }}
                        >
                            <BellIcon sx={{ fontSize: 20 }} />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* Settings (desktop) */}
                <Tooltip title="Settings" arrow>
                    <IconButton
                        onClick={() => navigate('/settings')}
                        aria-label="Settings"
                        sx={{
                            display: { xs: 'none', sm: 'inline-flex' },
                            color: '#78716C',
                            transition: 'color 0.15s ease-out',
                            '&:hover': { color: '#1C1917' },
                        }}
                    >
                        <SettingsIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                </Tooltip>

                {/* Divider */}
                <Box
                    sx={{
                        width: '1px',
                        height: 20,
                        bgcolor: 'rgba(28, 25, 23, 0.08)',
                        display: { xs: 'none', sm: 'block' },
                        mx: 0.5,
                    }}
                />

                {/* User avatar + dropdown */}
                <Box
                    onClick={handleMenuOpen}
                    role="button"
                    tabIndex={0}
                    aria-label="User menu"
                    aria-haspopup="true"
                    aria-expanded={Boolean(anchorEl)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleMenuOpen(e); }}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        p: '4px 8px 4px 4px',
                        borderRadius: '10px',
                        transition: 'all 0.15s ease-out',
                        '&:hover': {
                            bgcolor: 'rgba(28, 25, 23, 0.04)',
                        },
                    }}
                >
                    <Avatar
                        sx={{
                            width: 30,
                            height: 30,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: '#DDA15E',
                            color: '#FFFFFF',
                        }}
                    >
                        {initials}
                    </Avatar>

                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1C1917', lineHeight: 1.2 }}>
                            {user?.firstName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#A8A29E', lineHeight: 1, textTransform: 'capitalize' }}>
                            {user?.role || 'user'}
                        </Typography>
                    </Box>

                    <ArrowDownIcon
                        sx={{
                            display: { xs: 'none', md: 'block' },
                            fontSize: 16,
                            color: '#A8A29E',
                            transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.15s ease-out',
                        }}
                    />
                </Box>

                {/* Dropdown menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    slotProps={{
                        paper: {
                            sx: {
                                mt: 1,
                                minWidth: 200,
                            }
                        }
                    }}
                >
                    {/* User info at top */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(28, 25, 23, 0.06)' }}>
                        <Typography sx={{ fontWeight: 500, fontSize: '0.8125rem', color: '#1C1917' }}>
                            {displayName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6875rem', color: '#A8A29E', textTransform: 'capitalize', mt: 0.25 }}>
                            {user?.role} · {user?.email}
                        </Typography>
                    </Box>

                    <Box sx={{ p: '4px' }}>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/profile'); }}
                        >
                            <ProfileIcon sx={{ fontSize: 16, mr: 1.5, color: '#78716C' }} />
                            My Profile
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/settings'); }}
                        >
                            <SettingsIcon sx={{ fontSize: 16, mr: 1.5, color: '#78716C' }} />
                            Account Settings
                        </MenuItem>

                        <Divider sx={{ my: '4px' }} />

                        <MenuItem
                            onClick={handleLogout}
                            sx={{
                                color: '#DC2626',
                                '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.06)', color: '#DC2626' },
                            }}
                        >
                            <LogoutIcon sx={{ fontSize: 16, mr: 1.5 }} />
                            Sign Out
                        </MenuItem>
                    </Box>
                </Menu>
            </Box>

            <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Box>
    );
};

export default Header;
