import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button } from '@mui/material';
import {
    Email, Phone, CalendarToday, Public, Speed, DataUsage, AccountCircle, Router, Edit
} from '@mui/icons-material';
import { formatDate } from '../../utils/helpers';

const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
        <div className="text-blue-400 mt-0.5">
            {React.cloneElement(icon, { fontSize: "small" })}
        </div>
        <div>
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{label}</p>
            <p className="text-white font-medium">{value || 'N/A'}</p>
        </div>
    </div>
);

const UserDetailsDialog = ({ open, onClose, user, onEdit }) => {
    if (!user) return null;

    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                style: {
                    backgroundColor: 'background.paper',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    
                    color: 'text.primary'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', p: 3 }}>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-background-paper shadow-lg">
                        {initials}
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">{user.firstName} {user.lastName}</h3>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-300 border border-white/10 mt-1">
                            {user.role}
                        </span>
                    </div>
                </div>
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <AccountCircle className="text-blue-500" />
                            Basic Information
                        </h4>
                        <div className="bg-white/5 rounded-2xl p-2 border border-white/5">
                            <InfoItem icon={<Email />} label="Email" value={user.email} />
                            <InfoItem icon={<Phone />} label="Phone" value={user.phoneNumber} />
                            <InfoItem icon={<CalendarToday />} label="Joined" value={formatDate(user.createdAt)} />
                        </div>
                    </div>

                    {/* Network Info */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <Router className="text-purple-500" />
                            Network Information
                        </h4>
                        <div className="bg-white/5 rounded-2xl p-2 border border-white/5">
                            <InfoItem icon={<Public />} label="Router IP" value={user.routerIp} />
                            <InfoItem icon={<Speed />} label="Last Active" value={user.lastLogin ? formatDate(user.lastLogin) : 'Never'} />
                        </div>
                    </div>

                    {/* Subscription Info */}
                    <div className="md:col-span-2 space-y-4">
                        <h4 className="flex items-center gap-2 text-lg font-bold text-white mb-4">
                            <DataUsage className="text-yellow-500" />
                            Current Subscription
                        </h4>

                        {user.activeSubscription ? (
                            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-2xl p-6 border border-yellow-500/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-gray-400 text-sm mb-1">Plan Name</p>
                                        <p className="text-xl font-bold text-white mb-2">{user.activeSubscription.DataPlan?.name}</p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${user.activeSubscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {user.activeSubscription.status}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="text-gray-400">Data Usage</span>
                                            <span className="text-white font-mono">
                                                {Math.round((user.activeSubscription.dataUsed / user.activeSubscription.DataPlan?.dataLimit) * 100)}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, (user.activeSubscription.dataUsed / user.activeSubscription.DataPlan?.dataLimit) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-right text-gray-500 mt-1">
                                            Expires: {formatDate(user.activeSubscription.endDate)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                                <p className="text-yellow-200">No active subscription found for this user.</p>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button
                    startIcon={<Edit />}
                    onClick={() => {
                        onClose();
                        onEdit(user);
                    }}
                    sx={{ color: 'info.main' }}
                >
                    Edit Profile
                </Button>
                <Button onClick={onClose} variant="contained" sx={{ bgcolor: 'text.primary', color: 'primary.contrastText', '&:hover': { bgcolor: 'grey.300' } }}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserDetailsDialog;
