import React from 'react';
import { Grid, useTheme } from '@mui/material';
import {
    Payment as PaymentIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    AttachMoney as MoneyIcon
} from '@mui/icons-material';
import StatCard from '../common/StatCard';

const PaymentStatsRow = ({ stats }) => {
    const theme = useTheme();
    const { totalPayments, completedPayments, pendingPayments, totalPaid } = stats;

    return (
        <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    icon={<PaymentIcon />}
                    title="Total Payments"
                    value={totalPayments}
                    color={theme.palette.primary.main}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    icon={<CheckCircleIcon />}
                    title="Completed"
                    value={completedPayments}
                    subtitle="payments"
                    color={theme.palette.success.main}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    icon={<ScheduleIcon />}
                    title="Pending"
                    value={pendingPayments}
                    subtitle="payments"
                    color={theme.palette.warning.main}
                />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <StatCard
                    icon={<MoneyIcon />}
                    title="Total Amount"
                    value={`KSh ${totalPaid.toFixed(2)}`}
                    subtitle="completed"
                    color={theme.palette.error.main}
                />
            </Grid>
        </Grid>
    );
};

export default PaymentStatsRow;
