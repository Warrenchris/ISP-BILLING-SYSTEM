import React from 'react';
import {
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Subscriptions as SubscriptionsIcon,
    MonetizationOn as MoneyIcon,
} from '@mui/icons-material';
import StatCard from '../common/StatCard';

const AdminStatsOverview = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                icon={<PeopleIcon />}
                title="Total Users"
                value={stats.totalUsers}
                subtitle={`${stats.activeUsers} active`}
                color="#FFD700"
                trend={12}
            />
            <StatCard
                icon={<CheckCircleIcon />}
                title="Active Users"
                value={stats.activeUsers}
                subtitle={`${stats.totalUsers > 0 ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}% of total`}
                color="#00d4aa"
                trend={8}
            />
            <StatCard
                icon={<SubscriptionsIcon />}
                title="Active Subscriptions"
                value={stats.activeSubscriptions}
                subtitle={`${stats.pendingSubscriptions} pending`}
                color="#74b9ff"
                trend={5}
            />
            <StatCard
                icon={<MoneyIcon />}
                title="Total Revenue"
                value={`KSh ${stats.totalRevenue.toLocaleString()}`}
                subtitle="All completed payments"
                color="#ffb800"
                trend={15}
            />
        </div>
    );
};

export default AdminStatsOverview;
