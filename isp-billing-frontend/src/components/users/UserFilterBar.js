import React from 'react';
import {
    Search as SearchIcon,
    Refresh as RefreshIcon,
    Add as AddIcon
} from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

const UserFilterBar = ({
    search,
    setSearch,
    filters,
    setFilters,
    loading,
    onRefresh,
    onAdd
}) => {
    return (
        <div className="mb-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
                >
                    <AddIcon fontSize="small" />
                    <span>Add User</span>
                </button>
            </div>

            <CustomCard>
                <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fontSize="small" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <select
                            value={filters.role}
                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                        >
                            <option value="all">All Roles</option>
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                            <option value="support">Support</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <select
                            value={filters.subscriptionStatus}
                            onChange={(e) => setFilters({ ...filters, subscriptionStatus: e.target.value })}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                        >
                            <option value="all">All Subscriptions</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="none">None</option>
                        </select>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            className={`w-full flex items-center justify-center gap-2 border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-all ${loading ? 'animate-pulse' : ''}`}
                        >
                            <RefreshIcon fontSize="small" className={loading ? 'animate-spin' : ''} />
                            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>
            </CustomCard>
        </div>
    );
};

export default UserFilterBar;
