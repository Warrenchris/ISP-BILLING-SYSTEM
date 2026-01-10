import React from 'react';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    DataUsage as DataUsageIcon,
    Person as PersonIcon,
} from '@mui/icons-material';
import CustomCard from '../common/CustomCard';
import { getStatusColor, formatDate } from '../../utils/helpers';

const UsersTable = ({ users, loading, onUserClick, onEdit, onDelete, onManageSubscriptions }) => {
    const getUserInitials = (firstName, lastName) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const getSubscriptionStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'expired': return 'text-red-500 bg-red-500/10 border-red-500/20';
            case 'pending': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'suspended': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
            default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
        }
    };

    const getStatusBadge = (status) => {
        const colorClass =
            status === 'active' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                status === 'inactive' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                    status === 'suspended' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                        'text-blue-500 bg-blue-500/10 border-blue-500/20';

        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
                {status}
            </span>
        );
    };

    return (
        <CustomCard>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10">
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Subscription</th>
                            <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-400">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading users...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-12 text-center text-gray-500">
                                    <PersonIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                                    <p>No users found matching your filters</p>
                                </td>
                            </tr>
                        ) : (
                            users.map((user) => (
                                <tr
                                    key={user.id}
                                    onClick={() => onUserClick(user)}
                                    className="group hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                {getUserInitials(user.firstName, user.lastName)}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white text-sm">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-300">{user.email}</p>
                                        <p className="text-xs text-blue-400">{user.phoneNumber}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(user.status)}
                                    </td>
                                    <td className="p-4">
                                        {user.activeSubscription ? (
                                            <div>
                                                <p className="text-sm text-white mb-1">
                                                    {user.activeSubscription?.plan?.name ||
                                                        user.activeSubscription?.DataPlan?.name ||
                                                        'Active Plan'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getSubscriptionStatusColor(user.activeSubscription.status)}`}>
                                                        {user.activeSubscription.status}
                                                    </span>
                                                    {user.activeSubscription.daysRemaining !== undefined && (
                                                        <span className="text-xs text-gray-500">
                                                            {user.activeSubscription.daysRemaining} days left
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-600 italic">No active subscription</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onManageSubscriptions(user); }}
                                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                title="Manage Subscriptions"
                                            >
                                                <DataUsageIcon sx={{ fontSize: 18 }} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onEdit(user); }}
                                                className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
                                                title="Edit User"
                                            >
                                                <EditIcon sx={{ fontSize: 18 }} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(user.id); }}
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                                title="Delete User"
                                            >
                                                <DeleteIcon sx={{ fontSize: 18 }} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </CustomCard>
    );
};

export default UsersTable;
