import React from 'react';
import {
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Block as BlockIcon,
    CheckCircleOutline as ActivateIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

const RecentUsersTable = ({ users, onAction }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-700 bg-green-50 border-green-200';
            case 'inactive': return 'text-amber-700 bg-amber-50 border-amber-200';
            case 'suspended': return 'text-red-700 bg-red-50 border-red-200';
            default: return 'text-gray-700 bg-gray-50 border-gray-200';
        }
    };

    return (
        <CustomCard>
            <div className="p-6">
                <h6 className="text-lg font-bold text-text-primary mb-6">Recent Users</h6>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">User</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Email</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Status</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Role</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-text-secondary">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {users.map((user) => (
                                <tr key={user.id} className="group hover:bg-black/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-text-primary text-sm">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-xs text-text-muted">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-text-secondary">{user.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-text-secondary border border-black/10 bg-black/5">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors border-0 cursor-pointer"
                                                title="View Details"
                                            >
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </button>
                                            <button
                                                className="p-1.5 rounded-lg text-text-secondary hover:bg-black/10 transition-colors border-0 cursor-pointer"
                                                title="Edit User"
                                            >
                                                <EditIcon sx={{ fontSize: 18 }} />
                                            </button>

                                            {user.status === 'active' ? (
                                                <button
                                                    onClick={() => onAction(user.id, 'suspend')}
                                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors border-0 cursor-pointer"
                                                    title="Suspend User"
                                                >
                                                    <BlockIcon sx={{ fontSize: 18 }} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onAction(user.id, 'activate')}
                                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-600/10 transition-colors border-0 cursor-pointer"
                                                    title="Activate User"
                                                >
                                                    <ActivateIcon sx={{ fontSize: 18 }} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </CustomCard>
    );
};

export default RecentUsersTable;
