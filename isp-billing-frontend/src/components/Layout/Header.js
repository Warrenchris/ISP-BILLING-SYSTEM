import React from 'react';
import {
    Menu as MenuIcon,
    Notifications as NotificationsIcon,
    Settings as SettingsIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import {
    IconButton,
    Avatar,
    Badge,
    Menu,
    MenuItem,
    Divider,
    useTheme
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
    const theme = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [anchorEl, setAnchorEl] = React.useState(null);

    const getPageTitle = () => {
        const path = location.pathname;
        if (path.includes('dashboard')) return 'Dashboard';
        if (path.includes('users')) return 'User Management';
        if (path.includes('payments')) return 'Payments';
        if (path.includes('subscriptions')) return 'Subscriptions';
        if (path.includes('data-plans')) return 'Data Plans';
        if (path.includes('invoices')) return 'Invoices';
        if (path.includes('data-usage')) return 'Data Usage';
        return 'ISP Billing';
    };

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleLogout = () => {
        handleMenuClose();
        logout();
        navigate('/login');
    };

    return (
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 md:px-8 bg-[rgba(15,15,15,0.75)] backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center gap-4">
                <IconButton
                    onClick={onMenuClick}
                    sx={{ display: { md: 'none' }, color: 'white' }}
                >
                    <MenuIcon />
                </IconButton>

                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
                    <p className="text-xs text-gray-400 hidden md:block">Welcome back, {user?.firstName || 'Admin'}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Search Bar - Hidden on Mobile */}
                <div className="hidden md:flex items-center px-4 py-2 bg-white/5 rounded-full border border-white/10 focus-within:border-blue-500/50 focus-within:bg-white/10 transition-all w-64">
                    <SearchIcon sx={{ color: 'rgba(255,255,255,0.3)', fontSize: 20 }} />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="bg-transparent border-none outline-none text-white text-sm ml-2 w-full placeholder-gray-500"
                    />
                </div>

                <IconButton sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <Badge badgeContent={3} color="error" sx={{ '& .MuiBadge-badge': { backgroundColor: 'error.main' } }}>
                        <NotificationsIcon />
                    </Badge>
                </IconButton>

                <IconButton sx={{ color: 'rgba(255,255,255,0.7)', '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }, display: { xs: 'none', sm: 'inline-flex' } }}>
                    <SettingsIcon />
                </IconButton>

                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

                <div
                    onClick={handleMenuOpen}
                    className="flex items-center gap-3 cursor-pointer p-1.5 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                >
                    <Avatar
                        sx={{
                            bgcolor: 'transparent',
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            width: 36,
                            height: 36,
                            fontSize: '0.9rem',
                            fontWeight: 600
                        }}
                    >
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                    </Avatar>
                    <div className="hidden md:block">
                        <p className="text-sm font-medium text-white leading-none">{user?.firstName}</p>
                        <p className="text-xs text-gray-400 mt-1 leading-none capitalize">{user?.role || 'User'}</p>
                    </div>
                </div>

                <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                    PaperProps={{
                        sx: {
                            bgcolor: 'rgba(26, 26, 46, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            mt: 1.5,
                            minWidth: 180,
                            borderRadius: 3,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            '& .MuiMenuItem-root': {
                                transition: 'all 0.2s',
                                mx: 1,
                                my: 0.5,
                                borderRadius: 2,
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                                    transform: 'translateX(4px)'
                                }
                            }
                        }
                    }}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                    <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>Profile</MenuItem>
                    <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>Account Settings</MenuItem>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />
                    <MenuItem onClick={handleLogout} sx={{ color: 'error.main', '&:hover': { bgcolor: 'error.main', opacity: 0.1 } }}>
                        Logout
                    </MenuItem>
                </Menu>
            </div>
        </div>
    );
};

export default Header;
