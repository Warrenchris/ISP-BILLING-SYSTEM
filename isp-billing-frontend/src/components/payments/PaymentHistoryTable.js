import React from 'react';
import {
    Box,
    Typography,
    Chip,
    IconButton,
    Tooltip,
    CircularProgress,
    Button,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Phone as PhoneIcon,
    MonetizationOn as CashIcon,
    AccountBalance as BankIcon,
    CreditCard as CardIcon,
    Payment as PaymentIcon,
    Refresh as RefreshIcon,
    Subscription as SubscriptionIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';
import CustomCard from '../common/CustomCard';

const getStatusColor = (status) => {
    const colors = {
        completed: '#00d4aa',
        pending: '#ffb800',
        failed: '#ff6b6b',
        cancelled: '#9e9e9e',
    };
    return colors[status] || '#9e9e9e';
};

const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
        case 'mpesa':
        case 'm-pesa':
            return <PhoneIcon className="text-sm" />;
        case 'cash':
            return <CashIcon className="text-sm" />;
        case 'bank':
            return <BankIcon className="text-sm" />;
        case 'card':
            return <CardIcon className="text-sm" />;
        default:
            return <PaymentIcon className="text-sm" />;
    }
};

const PaymentHistoryTable = ({
    payments,
    loading,
    isAdmin,
    onViewDetails,
    onConfirm,
    onReject,
    processing,
    onRefresh
}) => {
    return (
        <CustomCard>
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Payment History
                    </h2>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={onRefresh}
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            '&:hover': {
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                                background: 'rgba(255, 255, 255, 0.05)',
                            },
                        }}
                    >
                        Refresh
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Transaction ID</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Method</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                {isAdmin && <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>}
                                <th className="py-4 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center">
                                        <CircularProgress size={24} sx={{ color: '#667eea' }} />
                                    </td>
                                </tr>
                            ) : payments.length > 0 ? (
                                payments.map((payment) => {
                                    const statusColor = getStatusColor(payment.status);
                                    const isPending = payment.status === 'pending';

                                    return (
                                        <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => onViewDetails(payment)}
                                                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        <VisibilityIcon sx={{ fontSize: 16 }} />
                                                    </button>
                                                    <span className="font-medium text-blue-300 font-mono text-sm">
                                                        {payment.transactionId}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-medium text-white">
                                                {formatCurrency(payment.amount)}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2 text-gray-300">
                                                    {getPaymentMethodIcon(payment.method)}
                                                    <span className="capitalize text-sm">{payment.method || 'Cash'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span
                                                    className="px-2.5 py-1 rounded-full text-xs font-medium border"
                                                    style={{
                                                        backgroundColor: `${statusColor}20`, // 20% opacity hex
                                                        color: statusColor,
                                                        borderColor: `${statusColor}40`, // 40% opacity hex
                                                    }}
                                                >
                                                    {payment.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-400">
                                                {formatDate(payment.createdAt)}
                                            </td>
                                            {isAdmin && (
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-white font-medium">
                                                            {payment.customerInfo?.name || 'Unknown'}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {payment.customerInfo?.email}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-4 px-4 text-right">
                                                {isAdmin && isPending ? (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Tooltip title="Confirm">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onConfirm(payment.id)}
                                                                    disabled={processing}
                                                                    sx={{
                                                                        color: '#00d4aa',
                                                                        bgcolor: 'rgba(0, 212, 170, 0.1)',
                                                                        border: '1px solid rgba(0, 212, 170, 0.2)',
                                                                        '&:hover': { bgcolor: 'rgba(0, 212, 170, 0.2)' },
                                                                        width: 32,
                                                                        height: 32,
                                                                    }}
                                                                >
                                                                    {processing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon fontSize="small" />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Reject">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => onReject(payment.id)}
                                                                    disabled={processing}
                                                                    sx={{
                                                                        color: '#ff6b6b',
                                                                        bgcolor: 'rgba(255, 107, 107, 0.1)',
                                                                        border: '1px solid rgba(255, 107, 107, 0.2)',
                                                                        '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.2)' },
                                                                        width: 32,
                                                                        height: 32,
                                                                    }}
                                                                >
                                                                    {processing ? <CircularProgress size={16} color="inherit" /> : <CancelIcon fontSize="small" />}
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-600 italic">No actions</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <PaymentIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                                            <p>No payment records found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </CustomCard>
    );
};

export default PaymentHistoryTable;
