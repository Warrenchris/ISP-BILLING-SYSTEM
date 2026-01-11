import React from 'react';
import { useTheme } from '@mui/material';
import {
    Person as PersonIcon,
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Block as BlockIcon,
    SupervisorAccount as SupervisorIcon,
    DataUsage as DataUsageIcon,
} from '@mui/icons-material';
import StatCard from '../common/StatCard';

const UserStatsRow = ({ stats }) => {
    const theme = useTheme();
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StatCard
                icon={<PersonIcon />}
                title="Total"
                value={stats.total}
                color={theme.palette.info.main}
            />
            <StatCard
                icon={<CheckCircleIcon />}
                title="Active"
                value={stats.active}
                color={theme.palette.success.main}
            />
            <StatCard
                icon={<WarningIcon />}
                title="Inactive"
                value={stats.inactive}
                color={theme.palette.warning.main}
            />
            <StatCard
                icon={<BlockIcon />}
                title="Suspended"
                value={stats.suspended}
                color={theme.palette.error.main}
            />
            <StatCard
                icon={<SupervisorIcon />}
                title="Admins"
                value={stats.admins}
                color={theme.palette.secondary.light}
            />
            <StatCard
                icon={<DataUsageIcon />}
                title="Subscribed"
                value={stats.withActiveSubscriptions}
                color={theme.palette.info.dark}
            />
        </div>
    );
};

export default UserStatsRow;
