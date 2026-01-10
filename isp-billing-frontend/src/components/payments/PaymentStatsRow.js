import React from 'react';
import { Grid } from '@mui/material';
import {
    Payment as PaymentIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    AttachMoney as MoneyIcon
} from '@mui/icons-material';
import StatCard from '../common/StatCard';

const PaymentStatsRow = ({ stats }) => {
    const { totalPayments, completedPayments, pendingPayments, totalPaid } = stats;

    return (
        <Grid container spacing={3} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    icon={<PaymentIcon />}
                    title="Total Payments"
                    value={totalPayments}
                    color="#667eea"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    icon={<CheckCircleIcon />}
                    title="Completed"
                    value={completedPayments}
                    subtitle="payments"
                    color="#00d4aa"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    icon={<ScheduleIcon />}
                    title="Pending"
                    value={pendingPayments}
                    subtitle="payments"
                    color="#ffb800"
                />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <StatCard
                    icon={<MoneyIcon />}
                    title="Total Amount"
                    value={`KSh ${totalPaid.toFixed(2)}`}
                    subtitle="completed"
                    color="#74b9ff"
                />
            </Grid>
        </Grid>
    );
};

export default PaymentStatsRow;
