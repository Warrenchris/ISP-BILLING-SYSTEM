import React from 'react';
import {
    Visibility as VisibilityIcon,
    Edit as EditIcon,
    Block as BlockIcon,
    CheckCircleOutline as ActivateIcon,
} from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

const RecentUsersTable = ({ users, onAction }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'inactive': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
            case 'suspended': return 'text-red-500 bg-red-500/10 border-red-500/20';
            default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <CustomCard>
            <div className="p-6">
                <h6 className="text-lg font-bold text-white mb-6">Recent Users</h6>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">User</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Email</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Role</th>
                                <th className="p-4 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((user) => (
                                <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#667eea] flex items-center justify-center text-white font-bold text-sm shadow-md">
                                                {user.firstName?.[0]}{user.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white text-sm">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                <p className="text-xs text-gray-500">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-sm text-gray-300">{user.email}</p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-gray-300 border border-white/20 bg-white/5">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                title="View Details"
                                            >
                                                <VisibilityIcon sx={{ fontSize: 18 }} />
                                            </button>
                                            <button
                                                className="p-1.5 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
                                                title="Edit User"
                                            >
                                                <EditIcon sx={{ fontSize: 18 }} />
                                            </button>

                                            {user.status === 'active' ? (
                                                <button
                                                    onClick={() => onAction(user.id, 'suspend')}
                                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                                    title="Suspend User"
                                                >
                                                    <BlockIcon sx={{ fontSize: 18 }} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => onAction(user.id, 'activate')}
                                                    className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
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
