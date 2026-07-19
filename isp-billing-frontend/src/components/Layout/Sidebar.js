import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    DashboardOutlined,
    PeopleAltOutlined,
    WifiOutlined,
    DataUsageOutlined,
    LayersOutlined,
    PaymentsOutlined,
    ReceiptLongOutlined,
    BarChartOutlined,
    SupportAgentOutlined,
    NotificationsOutlined,
    RouterOutlined,
    AdminPanelSettingsOutlined,
    ConfirmationNumberOutlined,
    SmsOutlined,
    StorageOutlined,
    HistoryOutlined,
    SettingsOutlined,
    SmartToyOutlined,
    ShowChartOutlined,
    WarningAmberOutlined,
    TrendingDownOutlined,
    LogoutOutlined,
    Close as CloseIcon,
    ChevronLeft,
    ChevronRight } from '@mui/icons-material';
import {
    Box, Drawer, IconButton, Tooltip, Typography, Divider,
    Avatar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

/* ─── Brand tokens ─────────────────────────────────────────────────────────── */
const T = {
    yellow:      '#DDA15E', // Warm Gold
    yellowGlow:  'rgba(221, 161, 94, 0.15)',
    yellowDim:   'rgba(221, 161, 94, 0.08)',
    bgTop:       '#FFFFFF',
    bgBottom:    '#FAF7F2',
    muted:       '#8E877E',
    inactive:    '#5C5852',
    hover:       'rgba(221, 161, 94, 0.05)',
    ease:        'cubic-bezier(0.4, 0, 0.2, 1)',
    displayFont: 'inherit' };

/* ─── Sidebar nav structure ─────────────────────────────────────────────────── */
const SIDEBAR_SECTIONS = [
    {
        title: 'MAIN',
        items: [{ text: 'Dashboard', icon: DashboardOutlined, path: '/dashboard' }] },
    {
        title: 'CUSTOMERS',
        items: [
            { text: 'Users',         icon: PeopleAltOutlined,   path: '/users'         },
            { text: 'Subscriptions', icon: WifiOutlined,         path: '/subscriptions' },
            { text: 'Data Usage',    icon: DataUsageOutlined,    path: '/data-usage'    },
        ] },
    {
        title: 'BILLING',
        items: [
            { text: 'Data Plans', icon: LayersOutlined,      path: '/data-plans' },
            { text: 'Payments',   icon: PaymentsOutlined,    path: '/payments'   },
            { text: 'Invoices',   icon: ReceiptLongOutlined, path: '/invoices'   },
            { text: 'Reports',    icon: BarChartOutlined,    path: '/reports'    },
        ] },
    {
        title: 'SUPPORT & OPS',
        items: [
            { text: 'Support Tickets', icon: SupportAgentOutlined,  path: '/tickets'       },
            { text: 'Notifications',   icon: NotificationsOutlined,  path: '/notifications' },
            { text: 'Service Status',  icon: RouterOutlined,          path: '/service-status'},
        ] },
    {
        title: 'AI & ANALYTICS',
        items: [
            { text: 'AI Dashboard',     icon: SmartToyOutlined,      path: '/ai-dashboard' },
            { text: 'Revenue Forecast', icon: ShowChartOutlined,     path: '/ai-dashboard', state: { scrollTo: 'revenue' } },
            { text: 'Anomalies',        icon: WarningAmberOutlined,  path: '/ai-dashboard', state: { scrollTo: 'anomalies' } },
            { text: 'Churn Risks',      icon: TrendingDownOutlined,  path: '/ai-dashboard', state: { scrollTo: 'churn' } },
        ] },
    {
        title: 'ADMINISTRATION',
        items: [
            { text: 'Staff & Roles', icon: AdminPanelSettingsOutlined, path: '/staff'      },
            { text: 'Network Devices', icon: RouterOutlined,           path: '/network-devices' },
            { text: 'Vouchers',       icon: ConfirmationNumberOutlined, path: '/vouchers'   },
            { text: 'SMS Logs',       icon: SmsOutlined,                path: '/sms-logs'   },
            { text: 'Queue Health',   icon: StorageOutlined,            path: '/queue-health' },
            { text: 'Audit Logs',    icon: HistoryOutlined,            path: '/audit-logs' },
            { text: 'Settings',      icon: SettingsOutlined,           path: '/settings'   },
        ] },
];

const getFilteredSections = (role) => {
    if (role === 'admin') return SIDEBAR_SECTIONS;
    if (role === 'customer') {
        // Customers only get access to Dashboard, Tickets, and Notifications
        return [
            {
                title: 'MAIN',
                items: [{ text: 'Dashboard', icon: DashboardOutlined, path: '/dashboard' }]
            },
            {
                title: 'SUPPORT & OPS',
                items: [
                    { text: 'Support Tickets', icon: SupportAgentOutlined,  path: '/tickets'       },
                    { text: 'Notifications',   icon: NotificationsOutlined,  path: '/notifications' },
                ]
            }
        ];
    }
    return SIDEBAR_SECTIONS.map(section => {
        if (section.title === 'ADMINISTRATION') return null;
        if (section.title === 'AI & ANALYTICS') return role === 'support' ? section : null;
        if (section.title === 'BILLING')
            return { ...section, items: section.items.filter(i => i.text !== 'Reports') };
        if (section.title === 'CUSTOMERS')
            return { ...section, items: section.items.filter(i => i.text !== 'Users') };
        return section;
    }).filter(Boolean);
};

/* ─── Section label divider ─────────────────────────────────────────────────── */
function SectionLabel({ title }) {
    return (
        <Box
            display="flex"
            alignItems="center"
            gap={1}
            sx={{ mb: 0.5, mt: 1.5, px: 1 }}
        >
            <Typography
                sx={{
                    color:          'primary.main',
                    fontSize:       '10px',
                    fontWeight:     700,
                    letterSpacing:  '0.15em',
                    whiteSpace:     'nowrap',
                    userSelect:     'none',
                    lineHeight:     1 }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    height: '1px',
                    flex: 1,
                    bgcolor: 'custom.borderDefault' }}
            />
        </Box>
    );
}

/* ─── Nav item ─────────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed, index, onNavigate }) {
    const Icon = item.icon;
    const location = useLocation();
    const isActive = location.pathname === item.path ||
        (item.path !== '/' && location.pathname.startsWith(item.path));

    return (
        <Tooltip
            title={collapsed ? item.text : ''}
            placement="right"
            arrow
            slotProps={{ tooltip: { sx: { bgcolor: 'background.paper', border: '1px solid rgba(43, 43, 43, 0.08)', color: 'text.primary', fontSize: 12, fontWeight: 600 } } }}
        >
            <NavLink
                to={item.path}
                state={item.state}
                onClick={onNavigate}
                className="nav-item-animate"
                style={{ textDecoration: 'none', display: 'block' }}
                data-delay={`${index * 50}ms`}
            >
                <Box
                    sx={{
                        display:        'flex',
                        alignItems:     'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap:            collapsed ? 0 : 1.5,
                        px:             collapsed ? 1 : 1.5,
                        py:             1.1,
                        mb:             '3px',
                        
                        position:       'relative',
                        overflow:       'hidden',
                        cursor:         'pointer',
                        transition:     `all 0.2s ${T.ease}`,

                        // Active state
                        ...(isActive ? {
                            background:  'linear-gradient(90deg, rgba(221,161,94,0.12) 0%, rgba(221,161,94,0.02) 100%)',
                            borderLeft:  `3px solid ${T.yellow}` } : {
                            borderLeft:  '3px solid transparent',
                            '&:hover': {
                                background:  T.hover,
                                borderLeft:  `3px solid rgba(221,161,94,0.45)`,
                                '& .nav-icon': {
                                    color: 'primary.main' },
                                '& .nav-label': { color: 'text.primary' } } }) }}
                >
                    {/* Active left-glow bar (absolute) */}
                    {isActive && (
                        <Box
                            sx={{
                                position:     'absolute',
                                left:         0,
                                top:          '50%',
                                transform:    'translateY(-50%)',
                                width:        3,
                                height:       '70%',
                                background:   T.yellow }}
                        />
                    )}

                    {/* Icon */}
                    <Icon
                        className="nav-icon"
                        sx={{
                            fontSize:   21,
                            flexShrink: 0,
                            transition: `all 0.2s ${T.ease}`,
                            color:      isActive ? 'primary.main' : T.inactive,
                            opacity:    isActive ? 1 : 0.75 }}
                    />

                    {/* Label */}
                    {!collapsed && (
                        <Typography
                            className="nav-label"
                            sx={{
                                fontSize:   '0.875rem',
                                fontWeight: isActive ? 700 : 500,
                                color:      isActive ? 'text.primary' : T.inactive,
                                transition: `all 0.2s ${T.ease}`,
                                whiteSpace: 'nowrap' }}
                        >
                            {item.text}
                        </Typography>
                    )}
                </Box>
            </NavLink>
        </Tooltip>
    );
}

/* ─── Collapse toggle button ────────────────────────────────────────────────── */
function CollapseToggle({ collapsed, onToggle }) {
    return (
        <IconButton
            onClick={onToggle}
            sx={{
                position:        'absolute',
                bottom:          24,
                right:           -16,
                width:           32,
                height:          32,
                bgcolor:         'background.paper',
                border:          `1.5px solid rgba(43, 43, 43, 0.08)`,
                color:           'text.primary',
                transition:      `all 0.2s ${T.ease}`,
                boxShadow:       `0 2px 10px rgba(43, 43, 43, 0.05)`,
                zIndex:          10,
                '&:hover': {
                    boxShadow:   `0 4px 15px rgba(43, 43, 43, 0.1)`,
                    transform:   'scale(1.12)',
                    bgcolor:     'background.elevated' } }}
        >
            {collapsed
                ? <ChevronRight sx={{ fontSize: 17 }} />
                : <ChevronLeft  sx={{ fontSize: 17 }} />}
        </IconButton>
    );
}

/* ─── Main DrawerContent ────────────────────────────────────────────────────── */
const DrawerContent = ({ collapsed, setCollapsed, onNavigate, isDesktop }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const displayName  = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
    const initials     = displayName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const filteredSecs = getFilteredSections(user?.role);

    // Flat list of all items for stagger index
    let globalIndex = 0;

    return (
        <Box
            sx={{
                height:        '100%',
                display:       'flex',
                flexDirection: 'column',
                position:      'relative',
                overflow:      'hidden',

                bgcolor: 'background.paper',
                color: 'text.primary',

                /* Right-edge border */
                '&::after': {
                    content:    '""',
                    position:   'absolute',
                    top:        0,
                    right:      0,
                    width:      '1px',
                    height:     '100%',
                    bgcolor:    'custom.borderDefault',
                    pointerEvents: 'none' } }}
        >
            {/* ── Logo / Brand ─────────────────────────────────────────── */}
            <Box
                sx={{
                    p:              collapsed ? '18px 0' : '18px 16px',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    borderBottom:   '1px solid rgba(43, 43, 43, 0.04)',
                    mb:             0.5 }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    {/* Glowing logo mark */}
                    <Box
                        sx={{
                            width:         42,
                            height:        42,
                            borderRadius:  '12px',
                            flexShrink:    0,
                            bgcolor:       'primary.main',
                            display:       'flex',
                            alignItems:    'center',
                            justifyContent:'center',
                            boxShadow:     `0 4px 15px -2px rgba(221, 161, 94, 0.45)`,
                            transition:    `box-shadow 0.3s ${T.ease}`,
                            '&:hover': {
                                boxShadow: `0 8px 20px -2px rgba(221, 161, 94, 0.6)` } }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 800,
                                fontSize:   '0.9rem',
                                color:      '#FFFFFF',
                                letterSpacing: '0.02em' }}
                        >
                            ISP
                        </Typography>
                    </Box>

                    {/* Brand name (hidden when collapsed) */}
                    {!collapsed && (
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight:    800,
                                    fontSize:      '1.1rem',
                                    lineHeight:    1.2,
                                    color:         'text.primary',
                                    letterSpacing: '0.01em',
                                }}
                            >
                                ISP Billing
                            </Typography>

                            {/* Version badge */}
                            <Box
                                component="span"
                                sx={{
                                    display:      'inline-flex',
                                    alignItems:   'center',
                                    mt:           '3px',
                                    px:           '7px',
                                    py:           '2px',
                                    borderRadius: '4px',
                                    background:   'rgba(45, 106, 79, 0.06)',
                                    border:       '1px solid rgba(45, 106, 79, 0.15)',
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize:      '9px',
                                        fontWeight:    700,
                                        color:         'secondary.main',
                                        letterSpacing: '0.08em',
                                    }}
                                >
                                    v2.0
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Mobile close */}
                {!isDesktop && (
                    <IconButton onClick={onNavigate} sx={{ color: T.muted, p: 0.5 }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>

            {/* ── Nav scroll area ──────────────────────────────────────── */}
            <Box
                className="sidebar-scroll"
                sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.5 }}
            >
                {filteredSecs.map((section) => (
                    <Box key={section.title} mb={1.5}>
                        {!collapsed ? (
                            <SectionLabel title={section.title} />
                        ) : (
                            <Divider sx={{ my: 1, borderColor: 'custom.borderDefault' }} />
                        )}

                        {section.items.map((item) => {
                            const idx = globalIndex++;
                            return (
                                <Box
                                    key={item.text}
                                    className="nav-item-animate"
                                    style={{ animationDelay: `${idx * 45}ms` }}
                                >
                                    <NavItem
                                        item={item}
                                        collapsed={collapsed}
                                        index={idx}
                                        onNavigate={!isDesktop ? onNavigate : undefined}
                                    />
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>

            {/* ── Footer / User profile ─────────────────────────────────── */}
            <Box
                sx={{
                    px:         1.5,
                    pt:         1.5,
                    pb:         2,
                    borderTop:  'none',
                    position:   'relative',
                    '&::before': {
                        content:  '""',
                        position: 'absolute',
                        top:      0,
                        left:     '10%',
                        right:    '10%',
                        height:   '1px',
                        bgcolor:  'custom.borderDefault' } }}
            >
                {/* Profile card */}
                <NavLink
                    to="/profile"
                    onClick={!isDesktop ? onNavigate : undefined}
                    style={{ textDecoration: 'none' }}
                >
                    {({ isActive }) => (
                        <Box
                            sx={{
                                display:       'flex',
                                alignItems:    'center',
                                gap:           1.5,
                                p:             collapsed ? 1 : 1.25,
                                mb:            0.75,
                                borderRadius:  '12px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                border:        `1px solid ${isActive ? 'rgba(221,161,94,0.25)' : 'rgba(43,43,43,0.04)'}`,
                                background:    isActive ? 'rgba(221,161,94,0.06)' : 'rgba(43,43,43,0.02)',
                                transition:    `all 0.2s ${T.ease}`,
                                cursor:        'pointer',
                                '&:hover': {
                                    border:     `1px solid rgba(221,161,94,0.3)`,
                                    background: 'rgba(221,161,94,0.08)' } }}
                        >
                            <Avatar
                                sx={{
                                    width:      34,
                                    height:     34,
                                    fontSize:   '0.8rem',
                                    fontWeight: 700,
                                    flexShrink: 0,
                                    bgcolor:    'secondary.main',
                                    color:      '#FFFFFF',
                                    boxShadow:  `0 2px 8px rgba(45, 106, 79, 0.2)` }}
                            >
                                {initials}
                            </Avatar>
                            {!collapsed && (
                                <Box overflow="hidden">
                                    <Typography variant="body2" fontWeight={700} noWrap color='text.primary'>
                                        {displayName}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: T.muted }} noWrap>
                                        View Account
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    )}
                </NavLink>

                {/* Sign out */}
                <Tooltip title={collapsed ? 'Sign Out' : ''} placement="right" arrow>
                    <Box
                        onClick={handleLogout}
                        sx={{
                            display:        'flex',
                            alignItems:     'center',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            gap:            1.5,
                            px:             collapsed ? 1 : 1.5,
                            py:             1,
                            borderRadius:   '8px',
                            cursor:         'pointer',
                            color:          'rgba(239,68,68,0.85)',
                            transition:     `all 0.2s ${T.ease}`,
                            '&:hover': {
                                bgcolor: 'rgba(239,68,68,0.08)',
                                color:   '#EF4444',
                                '& .logout-icon': {
                                    transform: 'translateX(3px)' } } }}
                    >
                        <LogoutOutlined
                            className="logout-icon"
                            sx={{ fontSize: 20, transition: `transform 0.2s ${T.ease}` }}
                        />
                        {!collapsed && (
                            <Typography variant="body2" fontWeight={600}>
                                Sign Out
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
            </Box>

            {/* Desktop collapse toggle */}
            {isDesktop && (
                <CollapseToggle collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
            )}
        </Box>
    );
};

/* ─── Sidebar wrapper ───────────────────────────────────────────────────────── */
const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const [collapsed, setCollapsed] = useState(false);

    const drawerWidth = collapsed ? 72 : 272;

    const commonPaperSx = {
        boxSizing:        'border-box',
        width:            drawerWidth,
        border:           'none',
        bgcolor:          'transparent',
        transition:       `width 0.28s ${T.ease}`,
        overflow:         'visible' };

    return (
        <Box
            component="nav"
            sx={{
                width:      { md: drawerWidth },
                flexShrink: { md: 0 },
                transition: `width 0.28s ${T.ease}` }}
        >
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { ...commonPaperSx, width: 272 },
                    '& .MuiBackdrop-root': { backdropFilter: 'blur(4px)' } }}
            >
                <DrawerContent
                    collapsed={false}
                    setCollapsed={setCollapsed}
                    onNavigate={() => setMobileOpen(false)}
                    isDesktop={false}
                />
            </Drawer>

            {/* Desktop permanent drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': commonPaperSx }}
                open
            >
                <DrawerContent
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    onNavigate={undefined}
                    isDesktop={true}
                />
            </Drawer>
        </Box>
    );
};

export default Sidebar;
