import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Dashboard as DashboardIcon,
    DataUsage as DataUsageIcon,
    Subscriptions as SubscriptionsIcon,
    Payment as PaymentIcon,
    Receipt as ReceiptIcon,
    NetworkCheck as NetworkCheckIcon,
    AdminPanelSettings as AdminIcon,
    Logout as LogoutIcon,
    Close as CloseIcon
} from '@mui/icons-material';
import { Box, Drawer, IconButton, Avatar, Typography } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
    { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
    { text: 'Data Plans', icon: DataUsageIcon, path: '/data-plans' },
    { text: 'Subscriptions', icon: SubscriptionsIcon, path: '/subscriptions' },
    { text: 'Payments', icon: PaymentIcon, path: '/payments' },
    { text: 'Invoices', icon: ReceiptIcon, path: '/invoices' },
    { text: 'Data Usage', icon: NetworkCheckIcon, path: '/data-usage' },
];

const adminMenuItems = [
    { text: 'Manage Users', icon: AdminIcon, path: '/admin/users' },
];

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin, logout } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavItem = ({ item }) => {
        const isSelected = location.pathname === item.path;
        const Icon = item.icon;

        return (
            <div
                onClick={() => {
                    navigate(item.path);
                    setMobileOpen(false);
                }}
                className={`
          flex items-center px-4 py-3 mb-1 mx-3 rounded-xl cursor-pointer transition-all duration-200 group
          ${isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }
        `}
            >
                <Icon className={`mr-3 text-xl ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                <span className="font-medium">{item.text}</span>
            </div>
        );
    };

    const drawerContent = (
        <div className="flex flex-col h-full bg-[#1a1a2e] text-white">
            {/* Logo Section */}
            <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <span className="font-bold text-lg">ISP</span>
                    </div>
                    <div>
                        <h1 className="font-bold text-lg leading-tight tracking-tight">ISP Billing</h1>
                        <p className="text-xs text-gray-400">Management System</p>
                    </div>
                </div>
                <div className="md:hidden">
                    <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'white' }}>
                        <CloseIcon />
                    </IconButton>
                </div>
            </div>

            <div className="px-6 py-2">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
                {menuItems.map((item) => (
                    <NavItem key={item.text} item={item} />
                ))}

                {isAdmin() && (
                    <>
                        <div className="px-6 py-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</p>
                        </div>
                        {adminMenuItems.map((item) => (
                            <NavItem key={item.text} item={item} />
                        ))}
                    </>
                )}
            </div>

            {/* User / Logout Section */}
            <div className="p-4 m-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                <div
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition-colors text-gray-300 hover:text-red-400"
                >
                    <LogoutIcon />
                    <span className="font-medium">Sign Out</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Helper div to reserve space on desktop */}
            <div className="hidden md:block w-[280px] shrink-0" />

            {/* Desktop Sidebar (Fixed) */}
            <div className="hidden md:block fixed top-0 left-0 w-[280px] h-full z-40 border-r border-white/5 bg-[#1a1a2e]">
                {drawerContent}
            </div>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: 280,
                        border: 'none',
                        bgcolor: '#1a1a2e'
                    },
                }}
            >
                {drawerContent}
            </Drawer>
        </>
    );
};

export default Sidebar;
