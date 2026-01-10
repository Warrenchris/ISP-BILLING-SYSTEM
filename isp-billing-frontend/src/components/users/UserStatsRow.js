import React from 'react';
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
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <StatCard
                icon={<PersonIcon />}
                title="Total"
                value={stats.total}
                color="#74b9ff"
            />
            <StatCard
                icon={<CheckCircleIcon />}
                title="Active"
                value={stats.active}
                color="#00d4aa"
            />
            <StatCard
                icon={<WarningIcon />}
                title="Inactive"
                value={stats.inactive}
                color="#ffb800"
            />
            <StatCard
                icon={<BlockIcon />}
                title="Suspended"
                value={stats.suspended}
                color="#ff6b6b"
            />
            <StatCard
                icon={<SupervisorIcon />}
                title="Admins"
                value={stats.admins}
                color="#a29bfe"
            />
            <StatCard
                icon={<DataUsageIcon />}
                title="Subscribed"
                value={stats.withActiveSubscriptions}
                color="#0984e3"
            />
        </div>
    );
};

export default UserStatsRow;
