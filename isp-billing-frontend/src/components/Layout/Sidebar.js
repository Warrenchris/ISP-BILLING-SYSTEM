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
    WifiTetheringOutlined,
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
    ChevronRight,
    ExpandMore,
    ExpandLess } from '@mui/icons-material';
import {
    Box, Drawer, IconButton, Tooltip, Typography,
    Avatar, Collapse } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

/* ─── Sidebar nav structure ─────────────────────────────────────────────────── */
const SIDEBAR_SECTIONS = [
    {
        title: 'Main',
        items: [{ text: 'Dashboard', icon: DashboardOutlined, path: '/dashboard' }],
        collapsible: false },
    {
        title: 'Customers',
        items: [
            { text: 'Users',         icon: PeopleAltOutlined,   path: '/users'         },
            { text: 'Subscriptions', icon: WifiOutlined,         path: '/subscriptions' },
            { text: 'Data Usage',    icon: DataUsageOutlined,    path: '/data-usage'    },
        ] },
    {
        title: 'Billing',
        items: [
            { text: 'Data Plans', icon: LayersOutlined,      path: '/data-plans' },
            { text: 'Payments',   icon: PaymentsOutlined,    path: '/payments'   },
            { text: 'Invoices',   icon: ReceiptLongOutlined, path: '/invoices'   },
            { text: 'Reports',    icon: BarChartOutlined,    path: '/reports'    },
        ] },
    {
        title: 'Support & Ops',
        items: [
            { text: 'Support Tickets', icon: SupportAgentOutlined,  path: '/tickets'       },
            { text: 'Notifications',   icon: NotificationsOutlined,  path: '/notifications' },
        ] },
    {
        title: 'AI & Analytics',
        items: [
            { text: 'AI Dashboard',     icon: SmartToyOutlined,      path: '/ai-dashboard' },
            { text: 'Revenue Forecast', icon: ShowChartOutlined,     path: '/ai-dashboard', state: { scrollTo: 'revenue' } },
            { text: 'Anomalies',        icon: WarningAmberOutlined,  path: '/ai-dashboard', state: { scrollTo: 'anomalies' } },
            { text: 'Churn Risks',      icon: TrendingDownOutlined,  path: '/ai-dashboard', state: { scrollTo: 'churn' } },
        ] },
    {
        title: 'Administration',
        items: [
            { text: 'Staff & Roles', icon: AdminPanelSettingsOutlined, path: '/staff'      },
            { text: 'Network Devices', icon: RouterOutlined,           path: '/network-devices' },
            { text: 'Active Sessions', icon: WifiTetheringOutlined,    path: '/active-sessions' },
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
        return [
            {
                title: 'Main',
                items: [{ text: 'Dashboard', icon: DashboardOutlined, path: '/dashboard' }],
                collapsible: false
            },
            {
                title: 'Support & Ops',
                items: [
                    { text: 'Support Tickets', icon: SupportAgentOutlined,  path: '/tickets'       },
                    { text: 'Notifications',   icon: NotificationsOutlined,  path: '/notifications' },
                ]
            }
        ];
    }
    return SIDEBAR_SECTIONS.map(section => {
        if (section.title === 'Administration') return null;
        if (section.title === 'AI & Analytics') return role === 'support' ? section : null;
        if (section.title === 'Billing')
            return { ...section, items: section.items.filter(i => i.text !== 'Reports') };
        if (section.title === 'Customers')
            return { ...section, items: section.items.filter(i => i.text !== 'Users') };
        return section;
    }).filter(Boolean);
};

/* ─── Section group with expand/collapse ─────────────────────────────────────── */
function SectionGroup({ title, children, collapsed, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);

    if (collapsed) {
        return (
            <Box sx={{ py: 0.5, '&:not(:first-of-type)': { mt: 1, pt: 1, borderTop: '1px solid rgba(28, 25, 23, 0.04)' } }}>
                {children}
            </Box>
        );
    }

    return (
        <Box sx={{ mb: 0.5 }}>
            <Box
                onClick={() => setOpen(o => !o)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.75,
                    cursor: 'pointer',
                    userSelect: 'none',
                    borderRadius: '8px',
                    transition: 'background 0.15s ease-out',
                    '&:hover': { bgcolor: 'rgba(28, 25, 23, 0.03)' },
                }}
            >
                <Typography
                    sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: '#A8A29E',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                    }}
                >
                    {title}
                </Typography>
                {open
                    ? <ExpandLess sx={{ fontSize: 14, color: '#A8A29E' }} />
                    : <ExpandMore sx={{ fontSize: 14, color: '#A8A29E' }} />}
            </Box>
            <Collapse in={open} timeout={200}>
                <Box sx={{ mt: 0.25 }}>
                    {children}
                </Box>
            </Collapse>
        </Box>
    );
}

/* ─── Nav item ─────────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed, onNavigate }) {
    const Icon = item.icon;
    const location = useLocation();
    const isActive = location.pathname === item.path ||
        (item.path !== '/' && location.pathname.startsWith(item.path));

    const content = (
        <NavLink
            to={item.path}
            state={item.state}
            onClick={onNavigate}
            style={{ textDecoration: 'none', display: 'block' }}
            aria-current={isActive ? 'page' : undefined}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 1.5,
                    px: collapsed ? 1 : 1.5,
                    py: 0.875,
                    mb: '2px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out',
                    position: 'relative',

                    // Active pill state
                    ...(isActive ? {
                        bgcolor: 'rgba(221, 161, 94, 0.1)',
                        '& .nav-icon': { color: '#DDA15E' },
                        '& .nav-label': { color: '#1C1917', fontWeight: 500 },
                    } : {
                        '&:hover': {
                            bgcolor: 'rgba(28, 25, 23, 0.04)',
                            '& .nav-icon': { color: '#78716C' },
                            '& .nav-label': { color: '#1C1917' },
                        },
                    }),
                }}
            >
                <Icon
                    className="nav-icon"
                    sx={{
                        fontSize: 20,
                        flexShrink: 0,
                        transition: 'color 0.15s ease-out',
                        color: isActive ? '#DDA15E' : '#A8A29E',
                    }}
                />

                {!collapsed && (
                    <Typography
                        className="nav-label"
                        sx={{
                            fontSize: '0.8125rem',
                            fontWeight: isActive ? 500 : 400,
                            color: isActive ? '#1C1917' : '#78716C',
                            transition: 'all 0.15s ease-out',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {item.text}
                    </Typography>
                )}
            </Box>
        </NavLink>
    );

    if (collapsed) {
        return (
            <Tooltip
                title={item.text}
                placement="right"
                arrow
                slotProps={{
                    tooltip: {
                        sx: {
                            bgcolor: '#1C1917',
                            color: '#FFFFFF',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            borderRadius: '8px',
                            px: 1.5,
                            py: 0.75,
                        }
                    }
                }}
            >
                {content}
            </Tooltip>
        );
    }

    return content;
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

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#FFFFFF',
                borderRadius: isDesktop ? '24px' : 0,
                m: isDesktop ? 1.5 : 0,
                border: isDesktop ? '1px solid rgba(28, 25, 23, 0.06)' : 'none',
                boxShadow: isDesktop ? '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)' : 'none',
                overflow: 'hidden',
            }}
        >
            {/* ── Logo / Brand ─────────────────────────────────────────── */}
            <Box
                sx={{
                    p: collapsed ? '20px 12px' : '20px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'space-between',
                    mb: 0.5,
                }}
            >
                <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: '10px',
                            flexShrink: 0,
                            bgcolor: '#DDA15E',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Typography
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                color: '#FFFFFF',
                                letterSpacing: '0.02em',
                            }}
                        >
                            ISP
                        </Typography>
                    </Box>

                    {!collapsed && (
                        <Box>
                            <Typography
                                sx={{
                                    fontWeight: 600,
                                    fontSize: '0.9375rem',
                                    lineHeight: 1.2,
                                    color: '#1C1917',
                                }}
                            >
                                ISP Billing
                            </Typography>
                            <Typography
                                sx={{
                                    fontSize: '0.6875rem',
                                    color: '#A8A29E',
                                    mt: '2px',
                                }}
                            >
                                v2.0
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Mobile close */}
                {!isDesktop && (
                    <IconButton
                        onClick={onNavigate}
                        sx={{ color: '#A8A29E', p: 0.5 }}
                        aria-label="Close sidebar"
                    >
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
                    <SectionGroup
                        key={section.title}
                        title={section.title}
                        collapsed={collapsed}
                        defaultOpen={section.collapsible !== false}
                    >
                        {section.items.map((item) => (
                            <NavItem
                                key={item.text + item.path}
                                item={item}
                                collapsed={collapsed}
                                onNavigate={!isDesktop ? onNavigate : undefined}
                            />
                        ))}
                    </SectionGroup>
                ))}
            </Box>

            {/* ── Footer / User profile ─────────────────────────────────── */}
            <Box
                sx={{
                    px: 1.5,
                    pt: 1,
                    pb: 2,
                    borderTop: '1px solid rgba(28, 25, 23, 0.06)',
                    mt: 1,
                }}
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
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                p: collapsed ? 1 : 1.25,
                                mb: 0.75,
                                borderRadius: '10px',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                                bgcolor: isActive ? 'rgba(221, 161, 94, 0.06)' : 'transparent',
                                transition: 'all 0.15s ease-out',
                                cursor: 'pointer',
                                '&:hover': {
                                    bgcolor: 'rgba(28, 25, 23, 0.04)',
                                },
                            }}
                        >
                            <Avatar
                                sx={{
                                    width: 32,
                                    height: 32,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    bgcolor: '#2D6A4F',
                                    color: '#FFFFFF',
                                }}
                            >
                                {initials}
                            </Avatar>
                            {!collapsed && (
                                <Box overflow="hidden">
                                    <Typography
                                        sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1C1917' }}
                                        noWrap
                                    >
                                        {displayName}
                                    </Typography>
                                    <Typography
                                        sx={{ fontSize: '0.6875rem', color: '#A8A29E' }}
                                        noWrap
                                    >
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
                        role="button"
                        tabIndex={0}
                        aria-label="Sign out"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleLogout(); }}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            gap: 1.5,
                            px: collapsed ? 1 : 1.5,
                            py: 0.875,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            color: '#DC2626',
                            transition: 'all 0.15s ease-out',
                            '&:hover': {
                                bgcolor: 'rgba(220, 38, 38, 0.06)',
                            },
                        }}
                    >
                        <LogoutOutlined sx={{ fontSize: 20 }} />
                        {!collapsed && (
                            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                                Sign Out
                            </Typography>
                        )}
                    </Box>
                </Tooltip>
            </Box>

            {/* Desktop collapse toggle — inline at bottom */}
            {isDesktop && (
                <Box
                    sx={{
                        px: 1.5,
                        pb: 1.5,
                        display: 'flex',
                        justifyContent: collapsed ? 'center' : 'flex-end',
                    }}
                >
                    <IconButton
                        onClick={() => setCollapsed(c => !c)}
                        size="small"
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        sx={{
                            width: 28,
                            height: 28,
                            color: '#A8A29E',
                            transition: 'all 0.15s ease-out',
                            '&:hover': {
                                bgcolor: 'rgba(28, 25, 23, 0.04)',
                                color: '#78716C',
                            },
                        }}
                    >
                        {collapsed
                            ? <ChevronRight sx={{ fontSize: 16 }} />
                            : <ChevronLeft sx={{ fontSize: 16 }} />}
                    </IconButton>
                </Box>
            )}
        </Box>
    );
};

/* ─── Sidebar wrapper ───────────────────────────────────────────────────────── */
const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const [collapsed, setCollapsed] = useState(false);

    const drawerWidth = collapsed ? 72 : 264;

    return (
        <Box
            component="nav"
            aria-label="Main navigation"
            sx={{
                width: { md: drawerWidth + 24 }, // +24 for margin
                flexShrink: { md: 0 },
                transition: 'width 0.2s ease-out',
            }}
        >
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        width: 264,
                        border: 'none',
                        bgcolor: 'transparent',
                    },
                    '& .MuiBackdrop-root': {
                        backdropFilter: 'blur(4px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    },
                }}
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
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth + 24, // +24 for padding
                        border: 'none',
                        bgcolor: 'transparent',
                        transition: 'width 0.2s ease-out',
                        overflow: 'visible',
                    },
                }}
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
