import React from 'react';
import {
    People as PeopleIcon,
    CheckCircle as CheckCircleIcon,
    Subscriptions as SubscriptionsIcon,
    MonetizationOn as MoneyIcon } from '@mui/icons-material';
import StatCard from '../common/StatCard';

import { useTheme } from '@mui/material';
import { formatCurrency } from '../../utils/helpers';

/**
 * Expects stats from parent (API-derived), including trend fields and display metadata:
 * totalUsers, totalUsersTrend, activeUsers, activeUsersTrend, activeSubscriptions,
 * activeSubscriptionsTrend, pendingSubscriptions, totalRevenue, totalRevenueTrend,
 * revenuePeriodLabel, currency
 */
const AdminStatsOverview = ({ stats }) => {
    const theme = useTheme();
    const total = stats.totalUsers ?? 0;
    const active = stats.activeUsers ?? 0;
    const activePct = total > 0 ? ((active / total) * 100).toFixed(1) : '0.0';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                icon={<PeopleIcon />}
                title="Total Users"
                value={stats.totalUsers}
                subtitle={`${stats.activeUsers} active`}
                color={theme.palette.primary.main}
                trend={stats.totalUsersTrend}
            />
            <StatCard
                icon={<CheckCircleIcon />}
                title="Active Users"
                value={stats.activeUsers}
                subtitle={`${activePct}% of total`}
                color={theme.palette.success.main}
                trend={stats.activeUsersTrend}
            />
            <StatCard
                icon={<SubscriptionsIcon />}
                title="Active Subscriptions"
                value={stats.activeSubscriptions}
                subtitle={`${stats.pendingSubscriptions} pending`}
                color={theme.palette.info.main}
                trend={stats.activeSubscriptionsTrend}
            />
            <StatCard
                icon={<MoneyIcon />}
                title="Total Revenue"
                value={formatCurrency(stats.totalRevenue ?? 0, stats.currency)}
                subtitle={stats.revenuePeriodLabel}
                color={theme.palette.warning.main}
                trend={stats.totalRevenueTrend}
            />
        </div>
    );
};

export default AdminStatsOverview;
