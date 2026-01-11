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
    HistoryOutlined,
    SettingsOutlined,
    AccountCircleOutlined,
    LogoutOutlined,
    Close as CloseIcon,
    ChevronLeft,
    ChevronRight
} from '@mui/icons-material';
import { Box, Drawer, IconButton, Tooltip, Typography, Divider, useMediaQuery, useTheme } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

// Sidebar Structure Configuration
const SIDEBAR_SECTIONS = [
    {
        title: 'MAIN',
        items: [
            { text: 'Dashboard', icon: DashboardOutlined, path: '/dashboard' }
        ]
    },
    {
        title: 'CUSTOMERS',
        items: [
            { text: 'Users', icon: PeopleAltOutlined, path: '/users' },
            { text: 'Subscriptions', icon: WifiOutlined, path: '/subscriptions' },
            { text: 'Data Usage', icon: DataUsageOutlined, path: '/data-usage' }
        ]
    },
    {
        title: 'BILLING',
        items: [
            { text: 'Data Plans', icon: LayersOutlined, path: '/data-plans' },
            { text: 'Payments', icon: PaymentsOutlined, path: '/payments' },
            { text: 'Invoices', icon: ReceiptLongOutlined, path: '/invoices' },
            { text: 'Reports', icon: BarChartOutlined, path: '/reports' }
        ]
    },
    {
        title: 'SUPPORT & OPS',
        items: [
            { text: 'Support Tickets', icon: SupportAgentOutlined, path: '/tickets' },
            { text: 'Notifications', icon: NotificationsOutlined, path: '/notifications' },
            { text: 'Service Status', icon: RouterOutlined, path: '/service-status' }
        ]
    },
    {
        title: 'ADMINISTRATION',
        items: [
            { text: 'Staff & Roles', icon: AdminPanelSettingsOutlined, path: '/staff' },
            { text: 'Audit Logs', icon: HistoryOutlined, path: '/audit-logs' },
            { text: 'Settings', icon: SettingsOutlined, path: '/settings' }
        ]
    }
];

// Helper to filter sections based on role
const getFilteredSections = (role) => {
    if (role === 'admin') return SIDEBAR_SECTIONS;

    // For non-admins, filter out Administration and Reports
    return SIDEBAR_SECTIONS.map(section => {
        if (section.title === 'ADMINISTRATION') return null;
        if (section.title === 'BILLING') {
            return {
                ...section,
                items: section.items.filter(item => item.text !== 'Reports')
            };
        }
        if (section.title === 'CUSTOMERS') {
            // Users might only care about their own usage, usually handled by generic "Data Usage"
            // Hide 'Users' list from customers
            return {
                ...section,
                items: section.items.filter(item => item.text !== 'Users')
            };
        }
        return section;
    }).filter(Boolean); // Remove null sections
};

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const navigate = useNavigate();
    // const location = useLocation();
    const { logout, user } = useAuth();
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
    const [collapsed, setCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const drawerWidth = collapsed ? 80 : 280;
    const primaryAccent = '#FFD600'; // ISP Yellow
    const bgDark = '#0B0B0B'; // Near-black

    const DrawerContent = () => (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: bgDark,
                color: 'white',
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'width 0.3s ease',
                overflow: 'hidden'
            }}
        >
            {/* Header / Logo */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${primaryAccent} 0%, #FFA000 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 0 15px ${primaryAccent}40`
                        }}
                    >
                        <Typography variant="h6" fontWeight="900" color="black">ISP</Typography>
                    </Box>
                    {!collapsed && (
                        <Box>
                            <Typography variant="subtitle1" fontWeight="700" lineHeight={1.2}>ISP Billing</Typography>
                            <Typography variant="caption" color="gray">System v2.0</Typography>
                        </Box>
                    )}
                </Box>
                {!isDesktop && (
                    <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'gray' }}>
                        <CloseIcon />
                    </IconButton>
                )}
            </Box>

            {/* Navigation Scroll Area */}
            <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 2, py: 1 }}>
                {getFilteredSections(user?.role).map((section) => (
                    <Box key={section.title} mb={2}>
                        {!collapsed && (
                            <Typography
                                variant="caption"
                                sx={{
                                    color: 'gray',
                                    fontWeight: 700,
                                    fontSize: '0.7rem',
                                    letterSpacing: '1px',
                                    mb: 1,
                                    display: 'block',
                                    pl: 1
                                }}
                            >
                                {section.title}
                            </Typography>
                        )}
                        {collapsed && <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />}

                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Tooltip key={item.text} title={collapsed ? item.text : ''} placement="right" arrow>
                                    <NavLink
                                        to={item.path}
                                        onClick={() => !isDesktop && setMobileOpen(false)}
                                        style={({ isActive }) => ({
                                            textDecoration: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: collapsed ? '12px' : '10px 16px',
                                            justifyContent: collapsed ? 'center' : 'flex-start',
                                            marginBottom: '4px',
                                            borderRadius: '12px',
                                            transition: 'all 0.2s ease',
                                            color: isActive ? 'black' : '#9ca3af',
                                            background: isActive ? primaryAccent : 'transparent',
                                            boxShadow: isActive ? `0 0 20px ${primaryAccent}40` : 'none',
                                            fontWeight: isActive ? 600 : 500,
                                        })}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <Icon
                                                    sx={{
                                                        fontSize: 22,
                                                        mr: collapsed ? 0 : 2,
                                                        color: isActive ? 'black' : 'inherit'
                                                    }}
                                                />
                                                {!collapsed && (
                                                    <span style={{ fontSize: '0.9rem' }}>{item.text}</span>
                                                )}
                                            </>
                                        )}
                                    </NavLink>
                                </Tooltip>
                            );
                        })}
                    </Box>
                ))}
            </Box>

            {/* Footer / Account */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <NavLink
                    to="/profile"
                    onClick={() => !isDesktop && setMobileOpen(false)}
                    style={({ isActive }) => ({
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px',
                        borderRadius: '12px',
                        marginBottom: '8px',
                        color: isActive ? 'white' : '#9ca3af',
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                    })}
                >
                    <AccountCircleOutlined sx={{ mr: collapsed ? 0 : 2, fontSize: 24 }} />
                    {!collapsed && (
                        <Box overflow="hidden">
                            <Typography variant="body2" fontWeight="600" noWrap>{user?.name || 'User Profile'}</Typography>
                            <Typography variant="caption" color="gray" noWrap>View Account</Typography>
                        </Box>
                    )}
                </NavLink>

                <Box
                    onClick={handleLogout}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        p: collapsed ? 1.5 : '10px 16px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
                        transition: 'all 0.2s'
                    }}
                >
                    <LogoutOutlined sx={{ mr: collapsed ? 0 : 2, fontSize: 22 }} />
                    {!collapsed && <Typography variant="body2" fontWeight="600">Sign Out</Typography>}
                </Box>

                {isDesktop && (
                    <IconButton
                        onClick={() => setCollapsed(!collapsed)}
                        sx={{
                            position: 'absolute',
                            bottom: 20,
                            right: -12,
                            bgcolor: '#1a1a1a',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            width: 24,
                            height: 24,
                            '&:hover': { bgcolor: primaryAccent, color: 'black' },
                            zIndex: 10
                        }}
                    >
                        {collapsed ? <ChevronRight sx={{ fontSize: 16 }} /> : <ChevronLeft sx={{ fontSize: 16 }} />}
                    </IconButton>
                )}
            </Box>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 }, transition: 'width 0.3s ease' }}>
            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, bgcolor: bgDark, border: 'none' },
                }}
            >
                <DrawerContent />
            </Drawer>

            {/* Desktop Permanent Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', bgcolor: 'transparent' },
                }}
                open
            >
                <DrawerContent />
            </Drawer>
        </Box>
    );
};

export default Sidebar;
