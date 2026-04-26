import React, { useState } from 'react';
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
import { useNavigate, useLocation } from 'react-router-dom';

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
    // Exact match first, then prefix match
    if (PAGE_META[pathname]) return PAGE_META[pathname];
    const key = Object.keys(PAGE_META).find(k => k !== '/' && pathname.startsWith(k));
    return PAGE_META[key] || { title: 'ISP Billing', sub: 'Welcome back' };
}

/* ─── Tokens ─────────────────────────────────────────────────────────────── */
const Y = 'var(--brand-yellow)';
const YG = 'var(--brand-yellow-glow)';
const E = 'cubic-bezier(0.4, 0, 0.2, 1)';

/* ─── Header ─────────────────────────────────────────────────────────────── */
const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { title, sub } = usePageMeta();

    const [anchorEl, setAnchorEl]     = useState(null);
    const [searchFocused, setFocused] = useState(false);

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
            sx={{
                position:       'sticky',
                top:            0,
                zIndex:         30,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'space-between',
                px:             { xs: 2, md: 4 },
                py:             1.5,
                background:     'rgba(10, 10, 18, 0.72)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom:   '1px solid var(--topbar-border)',
                boxShadow:      '0 1px 0 theme.palette.action.hover' }}
        >
            {/* ── Left: hamburger + page title ── */}
            <Box display="flex" alignItems="center" gap={2}>
                {/* Mobile hamburger */}
                <IconButton
                    onClick={onMenuClick}
                    sx={{
                        display: { md: 'none' },
                        color:   'rgba(255,255,255,0.7)',
                        '&:hover': { color: 'text.primary', bgcolor: 'theme.palette.action.hover' } }}
                >
                    <MenuIcon />
                </IconButton>

                {/* Page title block */}
                <Box
                    sx={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        1.5 }}
                >
                    {/* Yellow accent bar */}
                    <Box
                        sx={{
                            width:        3,
                            height:       36,
                            
                            background:   Y,
                            boxShadow:    `0 0 10px ${YG}`,
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
                                fontSize:      '0.7rem',
                                color:         'var(--text-muted)',
                                letterSpacing: '0.06em',
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
                    sx={{
                        display:      { xs: 'none', md: 'flex' },
                        alignItems:   'center',
                        gap:          1,
                        px:           2,
                        py:           0.85,
                        
                        background:   searchFocused
                            ? 'rgba(255,255,255,0.07)'
                            : 'rgba(255,255,255,0.04)',
                        border:       `1px solid ${searchFocused
                            ? 'rgba(255,214,0,0.35)'
                            : 'rgba(255,255,255,0.09)'}`,
                        transition:   `all 0.2s ${E}`,
                        width:        220,
                        boxShadow:    searchFocused ? `0 0 0 3px rgba(255,214,0,0.08)` : 'none' }}
                >
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 18 }} />
                    <input
                        type="text"
                        placeholder="Quick search…"
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        style={{
                            background:  'transparent',
                            border:      'none',
                            outline:     'none',
                            color:       'text.primary',
                            fontSize:    '0.8rem',
                            width:       '100%' }}
                    />
                </Box>

                {/* Notification bell */}
                <Tooltip title="Notifications" arrow>
                    <IconButton
                        onClick={() => navigate('/notifications')}
                        sx={{
                            color:     'rgba(255,255,255,0.65)',
                            transition:`all 0.2s ${E}`,
                            '&:hover': {
                                color:  'text.primary',
                                bgcolor:'theme.palette.action.hover',
                                transform: 'scale(1.08)' } }}
                    >
                        <Badge
                            badgeContent={3}
                            sx={{
                                '& .MuiBadge-badge': {
                                    bgcolor:   '#ef4444',
                                    color:     'text.primary',
                                    fontSize:  '0.6rem',
                                    fontWeight:700,
                                    minWidth:  16,
                                    height:    16,
                                    boxShadow: '0 0 6px rgba(239,68,68,0.6)' } }}
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
                            color:     'rgba(255,255,255,0.55)',
                            transition:`all 0.2s ${E}`,
                            '&:hover': {
                                color:   'text.primary',
                                bgcolor: 'theme.palette.action.hover',
                                transform:'rotate(22deg)' } }}
                    >
                        <SettingsIcon />
                    </IconButton>
                </Tooltip>

                {/* Divider */}
                <Box sx={{ width: 1, height: 28, bgcolor: 'rgba(255,255,255,0.1)', display: { xs: 'none', sm: 'block' } }} />

                {/* User avatar + dropdown */}
                <Box
                    onClick={handleMenuOpen}
                    sx={{
                        display:     'flex',
                        alignItems:  'center',
                        gap:         1,
                        cursor:      'pointer',
                        p:           '6px 10px 6px 6px',
                        
                        border:      `1px solid ${Boolean(anchorEl) ? 'rgba(255,214,0,0.35)' : 'rgba(255,255,255,0.09)'}`,
                        background:  Boolean(anchorEl)
                            ? 'rgba(255,214,0,0.06)'
                            : 'theme.palette.action.hover',
                        transition:  `all 0.2s ${E}`,
                        '&:hover': {
                            border:    '1px solid rgba(255,214,0,0.3)',
                            background:'rgba(255,214,0,0.05)' } }}
                >
                    <Avatar
                        sx={{
                            width:      34,
                            height:     34,
                            fontSize:   '0.78rem',
                            fontWeight: 800,
                            bgcolor: 'primary.main', color: 'primary.contrastText',
                            boxShadow:  `0 0 10px ${YG}` }}
                    >
                        {initials}
                    </Avatar>

                    <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}>
                            {user?.firstName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1, textTransform: 'capitalize' }}>
                            {user?.role || 'user'}
                        </Typography>
                    </Box>

                    <ArrowDownIcon
                        sx={{
                            display:   { xs: 'none', md: 'block' },
                            fontSize:  16,
                            color:     'rgba(255,255,255,0.4)',
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
                            mt:             1.5,
                            minWidth:       200,
                            
                            bgcolor:        'rgba(18,18,30,0.97)',
                            backdropFilter: 'blur(20px)',
                            border:         '1px solid rgba(255,255,255,0.1)',
                            boxShadow:      '0 16px 48px rgba(0,0,0,0.5)',
                            overflow:       'hidden' } }}
                >
                    {/* User card at top */}
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', color: 'text.primary' }}>
                            {displayName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {user?.role} · {user?.email}
                        </Typography>
                    </Box>

                    <Box sx={{ p: '6px' }}>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/profile'); }}
                            sx={menuItemSx}
                        >
                            <ProfileIcon sx={{ fontSize: 18, mr: 1.5, color: 'rgba(255,255,255,0.6)' }} />
                            My Profile
                        </MenuItem>
                        <MenuItem
                            onClick={() => { handleMenuClose(); navigate('/settings'); }}
                            sx={menuItemSx}
                        >
                            <SettingsIcon sx={{ fontSize: 18, mr: 1.5, color: 'rgba(255,255,255,0.6)' }} />
                            Account Settings
                        </MenuItem>

                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: '6px' }} />

                        <MenuItem
                            onClick={handleLogout}
                            sx={{
                                ...menuItemSx,
                                color: '#EF4444',
                                '&:hover': { bgcolor: 'rgba(239,68,68,0.12)', color: 'error.light' } }}
                        >
                            <LogoutIcon sx={{ fontSize: 18, mr: 1.5 }} />
                            Sign Out
                        </MenuItem>
                    </Box>
                </Menu>
            </Box>
        </Box>
    );
};

/* Shared menu item styles */
const menuItemSx = {
    
    fontSize:     '0.85rem',
    fontWeight:   500,
    color:        'rgba(255,255,255,0.82)',
    transition:   'all 0.15s ease',
    gap:          0,
    '&:hover': {
        bgcolor:   'rgba(255,255,255,0.07)',
        color:     'text.primary',
        transform: 'translateX(3px)' } };

export default Header;
