import React, { useState, useEffect } from 'react';
import {
    Menu as MenuIcon,
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
    '/settings':       { title: 'Settings',           sub: 'System configuration'              } };

function usePageMeta() {
    const { pathname } = useLocation();
    if (PAGE_META[pathname]) return PAGE_META[pathname];
    const key = Object.keys(PAGE_META).find(k => k !== '/' && pathname.startsWith(k));
    return PAGE_META[key] || { title: 'ISP Billing', sub: 'Welcome back' };
}

/* ─── Header Component ─────────────────────────────────────────────────────── */
const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { title, sub } = usePageMeta();

    const [anchorEl, setAnchorEl]     = useState(null);
    const [searchFocused, setFocused] = useState(false);
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

    const E = 'cubic-bezier(0.4, 0, 0.2, 1)';

    return (
        <Box
            component="header"
            sx={{
                position:       'sticky',
                top:            0,
                zIndex:         30,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                px:             { xs: 2, md: 4 },
                py:             1.5,
                background:     'rgba(250, 247, 242, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom:   '1px solid rgba(43, 43, 43, 0.06)',
                boxShadow:      '0 2px 12px -2px rgba(43, 43, 43, 0.02)' }}
        >
            {/* ── Left: hamburger + page title ── */}
            <Box display="flex" alignItems="center" gap={2}>
                {/* Mobile hamburger */}
                <IconButton
                    onClick={onMenuClick}
                    sx={{
                        display: { md: 'none' },
                        color:   'text.primary',
                        '&:hover': { bgcolor: 'rgba(43, 43, 43, 0.04)' } }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Page title block */}
                <Box display="flex" alignItems="center" gap={1.5}>
                    {/* Gold brand bar */}
                    <Box
                        sx={{
                            width:        3,
                            height:       32,
                            borderRadius: '4px',
                            background:   '#DDA15E',
                            flexShrink:   0 }}
                    />
                    <Box>
                        <Typography
                            sx={{
                                fontWeight:    800,
                                fontSize:      { xs: '1rem', md: '1.2rem' },
                                color:         'text.primary',
                                lineHeight:    1.1,
                                letterSpacing: '-0.01em' }}
                        >
                            {title}
                        </Typography>
                        <Typography
                            sx={{
                                display:       { xs: 'none', sm: 'block' },
                                fontSize:      '0.75rem',
                                color:         'text.secondary',
                                letterSpacing: '0.01em',
                                mt:            '2px',
                                lineHeight:    1 }}
                        >
                            {sub}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* ── Right: search + actions ── */}
            <Box display="flex" alignItems="center" gap={{ xs: 0.5, md: 1.5 }}>

                {/* Search bar (desktop) */}
                <Box
                    onClick={() => setSearchOpen(true)}
                    sx={{
                        display:      { xs: 'none', md: 'flex' },
                        alignItems:   'center',
                        gap:          1,
                        px:           2,
                        py:           0.75,
                        borderRadius: '12px',
                        cursor:       'pointer',
                        background:   searchFocused ? '#FFFFFF' : 'rgba(43, 43, 43, 0.03)',
                        border:       `1.5px solid ${searchFocused ? '#DDA15E' : 'rgba(43, 43, 43, 0.06)'}`,
                        transition:   `all 0.2s ${E}`,
                        width:        220,
                        boxShadow:    searchFocused ? `0 4px 15px -4px rgba(221, 161, 94, 0.2)` : 'none' }}
                >
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.85rem' }}>
                        Search... (Ctrl+K)
                    </Typography>
                </Box>

                {/* Notification bell */}
                <Tooltip title="Notifications" arrow>
                    <IconButton
                        onClick={() => navigate('/notifications')}
                        sx={{
                            color:     'text.secondary',
                            transition:`all 0.2s ${E}`,
                            '&:hover': {
                                color:  'text.primary',
                                bgcolor:'rgba(43, 43, 43, 0.04)',
                                transform: 'scale(1.05)' } }}
                    >
                        <Badge
                            badgeContent={unreadCount}
                            sx={{
                                '& .MuiBadge-badge': {
                                    bgcolor:   '#EF4444',
                                    color:     '#FFFFFF',
                                    fontSize:  '0.65rem',
                                    fontWeight:700,
                                    minWidth:  16,
                                    height:    16,
                                    boxShadow: '0 0 6px rgba(239,68,68,0.3)' } }}
                        >
                            <BellIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* Settings (desktop) */}
                <Tooltip title="Settings" arrow>
                    <IconButton
                        onClick={() => navigate('/settings')}
                        sx={{
                            display:   { xs: 'none', sm: 'inline-flex' },
                            color:     'text.secondary',
                            transition:`all 0.2s ${E}`,
                            '&:hover': {
                                color:   'text.primary',
                                bgcolor: 'rgba(43, 43, 43, 0.04)',
                                transform:'rotate(20deg)' } }}
                    >
                        <SettingsIcon />
                    </IconButton>
                </Tooltip>

                {/* Divider */}
                <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(43, 43, 43, 0.08)', display: { xs: 'none', sm: 'block' } }} />

                {/* User avatar + dropdown */}
                <Box
                    onClick={handleMenuOpen}
                    sx={{
                        display:     'flex',
                        alignItems:  'center',
                        gap:         1,
                        cursor:      'pointer',
                        p:           '4px 8px 4px 4px',
                        borderRadius:'12px',
                        border:      `1.5px solid ${Boolean(anchorEl) ? '#DDA15E' : 'rgba(43, 43, 43, 0.06)'}`,
                        background:  Boolean(anchorEl) ? 'rgba(221, 161, 94, 0.05)' : '#FFFFFF',
                        transition:  `all 0.2s ${E}`,
                        boxShadow:   '0 2px 8px rgba(43, 43, 43, 0.02)',
                        '&:hover': {
                            border:    '1.5px solid #DDA15E',
                            background:'rgba(221, 161, 94, 0.04)' } }}
                >
                    <Avatar
                        sx={{
                            width:      32,
                            height:     32,
                            fontSize:   '0.75rem',
                            fontWeight: 800,
                            bgcolor:    'primary.main',
                            color:      '#FFFFFF',
                            boxShadow:  `0 2px 8px rgba(221, 161, 94, 0.25)` }}
                    >
                        {initials}
                    </Avatar>

                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
                            {user?.firstName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', lineHeight: 1, textTransform: 'capitalize' }}>
                            {user?.role || 'user'}
                        </Typography>
                    </Box>

                    <ArrowDownIcon
                        sx={{
                            display:   { xs: 'none', md: 'block' },
                            fontSize:  16,
                            color:     'text.secondary',
                            transform: Boolean(anchorEl) ? 'rotate(180deg)' : 'none',
                            transition:`transform 0.2s ${E}` }}
                    />
                </Box>

                {/* Dropdown menu */}
                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{
                        sx: {
                            mt:             1,
                            minWidth:       210,
                            bgcolor:        '#FFFFFF',
                            border:         '1px solid rgba(43, 43, 43, 0.08)',
                            boxShadow:      '0 12px 30px -4px rgba(43, 43, 43, 0.08)',
                            borderRadius:   '14px',
                            overflow:       'hidden' } }}
                >
                    {/* User card at top */}
                    <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(43, 43, 43, 0.06)', bgcolor: 'rgba(250, 247, 242, 0.5)' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
                            {displayName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', textTransform: 'capitalize', mt: 0.25 }}>
                            {user?.role} · {user?.email}
                        </Typography>
                    </Box>

                    <Box sx={{ p: '6px' }}>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/profile'); }}
                            sx={menuItemSx}
                        >
                            <ProfileIcon sx={{ fontSize: 18, mr: 1.5, color: 'text.secondary' }} />
                            My Profile
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/settings'); }}
                            sx={menuItemSx}
                        >
                            <SettingsIcon sx={{ fontSize: 18, mr: 1.5, color: 'text.secondary' }} />
                            Account Settings
                        </MenuItem>

                        <Divider sx={{ borderColor: 'rgba(43, 43, 43, 0.06)', my: '6px' }} />

                        <MenuItem
                            onClick={handleLogout}
                            sx={{
                                ...menuItemSx,
                                color: '#EF4444',
                                '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.06)', color: '#EF4444' } }}
                        >
                            <LogoutIcon sx={{ fontSize: 18, mr: 1.5 }} />
                            Sign Out
                        </MenuItem>
                    </Box>
                </Menu>
            </Box>

            <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Box>
    );
};

/* Shared menu item styles */
const menuItemSx = {
    fontSize:     '0.85rem',
    fontWeight:   500,
    color:        'text.primary',
    borderRadius: '8px',
    py:           1,
    px:           1.5,
    my:           0.25,
    transition:   'all 0.15s ease',
    '&:hover': {
        bgcolor:   'rgba(221, 161, 94, 0.06)',
        color:     'text.primary',
        transform: 'translateX(2px)' } };

export default Header;
