import React, { useState } from 'react';
import {
    IconButton,
    Tooltip,
    CircularProgress,
    Button,
    Box,
    Typography,
    useTheme } from '@mui/material';
import {
    Visibility as VisibilityIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Phone as PhoneIcon,
    MonetizationOn as CashIcon,
    AccountBalance as BankIcon,
    CreditCard as CardIcon,
    Payment as PaymentIcon,
    Refresh as RefreshIcon } from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';
import DataTable from '../ui/DataTable';
import StatusBadge from '../ui/StatusBadge';

const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
        case 'mpesa':
        case 'm-pesa':
            return <PhoneIcon sx={{ fontSize: 16 }} />;
        case 'cash':
            return <CashIcon sx={{ fontSize: 16 }} />;
        case 'bank':
            return <BankIcon sx={{ fontSize: 16 }} />;
        case 'card':
            return <CardIcon sx={{ fontSize: 16 }} />;
        default:
            return <PaymentIcon sx={{ fontSize: 16 }} />;
    }
};

const PaymentHistoryTable = ({
    payments = [],
    loading,
    isAdmin,
    onViewDetails,
    onConfirm,
    onReject,
    processing,
    onRefresh
}) => {
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const columns = [
        {
            headerName: 'Transaction ID',
            field: 'transactionId',
            renderCell: (row) => (
                <Box display="flex" alignItems="center" gap={1}>
                    <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onViewDetails(row); }}
                        sx={{
                            p: 0.75,
                            borderRadius: '8px',
                            bgcolor: 'rgba(221, 161, 94, 0.1)',
                            color: '#DDA15E',
                            '&:hover': { bgcolor: 'rgba(221, 161, 94, 0.2)' }
                        }}
                    >
                        <VisibilityIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 500, color: '#1C1917' }}>
                        {row.transactionId}
                    </Typography>
                </Box>
            )
        },
        {
            headerName: 'Amount',
            field: 'amount',
            renderCell: (row) => (
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1C1917' }}>
                    {formatCurrency(row.amount)}
                </Typography>
            )
        },
        {
            headerName: 'Method',
            field: 'method',
            renderCell: (row) => (
                <Box display="flex" alignItems="center" gap={1} color="#78716C">
                    {getPaymentMethodIcon(row.method)}
                    <Typography sx={{ textTransform: 'capitalize', fontSize: '0.8125rem' }}>
                        {row.method || 'Cash'}
                    </Typography>
                </Box>
            )
        },
        {
            headerName: 'Status',
            field: 'status',
            renderCell: (row) => (
                <StatusBadge status={row.status} />
            )
        },
        {
            headerName: 'Date',
            field: 'createdAt',
            renderCell: (row) => (
                <Typography sx={{ fontSize: '0.8125rem', color: '#78716C' }}>
                    {formatDate(row.createdAt)}
                </Typography>
            )
        },
        ...(isAdmin ? [{
            headerName: 'Customer',
            field: 'customerInfo',
            renderCell: (row) => (
                <Box>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1C1917' }}>
                        {row.customerInfo?.name || 'Unknown'}
                    </Typography>
                    <Typography sx={{ fontSize: '0.6875rem', color: '#A8A29E' }}>
                        {row.customerInfo?.email}
                    </Typography>
                </Box>
            )
        }] : []),
        {
            headerName: 'Actions',
            align: 'right',
            renderCell: (row) => (
                isAdmin && row.status === 'pending' ? (
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <Tooltip title="Confirm Payment">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onConfirm(row.id); }}
                                    disabled={processing}
                                    sx={{
                                        color: '#2D6A4F',
                                        bgcolor: 'rgba(45, 106, 79, 0.08)',
                                        border: '1px solid rgba(45, 106, 79, 0.15)',
                                        '&:hover': { bgcolor: 'rgba(45, 106, 79, 0.16)' },
                                        width: 32,
                                        height: 32
                                    }}
                                >
                                    {processing ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Tooltip title="Reject Payment">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={(e) => { e.stopPropagation(); onReject(row.id); }}
                                    disabled={processing}
                                    sx={{
                                        color: '#DC2626',
                                        bgcolor: 'rgba(220, 38, 38, 0.08)',
                                        border: '1px solid rgba(220, 38, 38, 0.15)',
                                        '&:hover': { bgcolor: 'rgba(220, 38, 38, 0.16)' },
                                        width: 32,
                                        height: 32
                                    }}
                                >
                                    {processing ? <CircularProgress size={16} color="inherit" /> : <CancelIcon fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
                ) : (
                    <Typography sx={{ fontSize: '0.75rem', color: '#A8A29E', fontStyle: 'italic' }}>
                        No actions
                    </Typography>
                )
            )
        }
    ];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" sx={{ fontWeight: 600, fontSize: '1.125rem', color: '#1C1917' }}>
                    Payment History
                </Typography>
                {onRefresh && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={onRefresh}
                        sx={{
                            borderColor: 'rgba(28, 25, 23, 0.12)',
                            color: '#78716C',
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': {
                                borderColor: '#DDA15E',
                                background: 'rgba(221, 161, 94, 0.04)'
                            }
                        }}
                    >
                        Refresh
                    </Button>
                )}
            </Box>

            <DataTable
                columns={columns}
                rows={payments}
                loading={loading}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                emptyTitle="No payment records found"
                emptySubtitle="Payment history will appear here once transactions are recorded."
                emptyIcon={<PaymentIcon sx={{ fontSize: 40, color: '#A8A29E' }} />}
            />
        </Box>
    );
};

export default PaymentHistoryTable;
