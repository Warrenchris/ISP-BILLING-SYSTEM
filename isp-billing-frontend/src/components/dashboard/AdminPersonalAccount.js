import React from 'react';
import {
    DataUsage as DataUsageIcon,
    Speed as SpeedIcon,
    Payment as PaymentIcon,
    Receipt as ReceiptIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';
import { useTheme, alpha } from '@mui/material';

const AccountStatBox = ({ icon, color, title, value }) => (
    <div
        className="p-6 rounded-xl border relative overflow-hidden transition-transform hover:scale-[1.02]"
        style={{
            background: alpha(color, 0.1),
            borderColor: alpha(color, 0.2)
        }}
    >
        <div className="flex items-center gap-4">
            <div
                className="flex items-center justify-center w-12 h-12 rounded-xl text-white shadow-lg"
                style={{ backgroundColor: color }}
            >
                {React.cloneElement(icon, { sx: { fontSize: 24 } })}
            </div>
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
                <h4 className="text-xl font-bold text-white tracking-tight">{value}</h4>
            </div>
        </div>
    </div>
);

const AdminPersonalAccount = ({ subscription, recentPaymentsCount, pendingInvoicesCount, usagePercentage }) => {
    const theme = useTheme();
    // Helper to format usage percentage
    const formattedUsage = typeof usagePercentage === 'number' ? usagePercentage.toFixed(1) : '0.0';

    return (
        <CustomCard className="mb-8">
            <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h5 className="text-xl font-bold text-white">Your Personal Account</h5>
                </div>

                <hr className="border-white/10 mb-8" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <AccountStatBox
                        icon={<DataUsageIcon />}
                        title="Current Plan"
                        value={subscription?.DataPlan?.name || 'No Plan'}
                        color={theme.palette.info.main}
                    />
                    <AccountStatBox
                        icon={<SpeedIcon />}
                        title="Data Usage"
                        value={`${formattedUsage}%`}
                        color={theme.palette.success.main}
                    />
                    <AccountStatBox
                        icon={<PaymentIcon />}
                        title="Recent Payments"
                        value={recentPaymentsCount}
                        color={theme.palette.warning.main}
                    />
                    <AccountStatBox
                        icon={<ReceiptIcon />}
                        title="Pending Invoices"
                        value={pendingInvoicesCount}
                        color={theme.palette.error.main}
                    />
                </div>
            </div>
        </CustomCard>
    );
};

export default AdminPersonalAccount;
