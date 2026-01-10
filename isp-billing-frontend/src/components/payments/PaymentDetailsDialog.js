import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Box,
    Chip,
    alpha
} from '@mui/material';
import {
    Phone as PhoneIcon,
    MonetizationOn as CashIcon,
    AccountBalance as BankIcon,
    CreditCard as CardIcon,
    Payment as PaymentIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/helpers';

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
        case 'm-pesa': return <PhoneIcon />;
        case 'cash': return <CashIcon />;
        case 'bank': return <BankIcon />;
        case 'card': return <CardIcon />;
        default: return <PaymentIcon />;
    }
};

const PaymentDetailsDialog = ({ open, payment, onClose }) => {
    if (!payment) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: '#1a1a2e',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                },
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Typography variant="h6" fontWeight="bold">
                    Payment Details
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Box
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Typography variant="body2" color="gray">Amount Paid</Typography>
                            <Typography variant="h4" fontWeight="bold" color="#00d4aa">
                                {formatCurrency(payment.amount)}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="caption" color="gray">Transaction ID</Typography>
                        <Typography variant="body1" fontWeight="medium">{payment.transactionId}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="caption" color="gray">Date</Typography>
                        <Typography variant="body1">{formatDate(payment.createdAt)}</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="caption" color="gray">Method</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            {getPaymentMethodIcon(payment.method)}
                            <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                                {payment.method || 'Cash'}
                            </Typography>
                        </Box>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="caption" color="gray">Status</Typography>
                        <Box mt={0.5}>
                            <Chip
                                label={payment.status}
                                size="small"
                                sx={{
                                    bgcolor: alpha(getStatusColor(payment.status), 0.2),
                                    color: getStatusColor(payment.status),
                                    border: `1px solid ${alpha(getStatusColor(payment.status), 0.3)}`,
                                    textTransform: 'capitalize',
                                    fontWeight: 600
                                }}
                            />
                        </Box>
                    </Grid>

                    {payment.description && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="gray">Description</Typography>
                            <Typography variant="body1" sx={{ bgcolor: 'rgba(255,255,255,0.02)', p: 1, borderRadius: 1, mt: 0.5 }}>
                                {payment.description}
                            </Typography>
                        </Grid>
                    )}

                    {payment.phoneNumber && (
                        <Grid item xs={12}>
                            <Typography variant="caption" color="gray">Phone Number</Typography>
                            <Typography variant="body1" fontFamily="monospace">
                                {payment.phoneNumber}
                            </Typography>
                        </Grid>
                    )}

                    <Grid item xs={12}>
                        <Typography variant="caption" color="gray">Customer Info</Typography>
                        <Box sx={{ mt: 0.5, p: 1.5, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                                {payment.customerInfo?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="gray">
                                {payment.customerInfo?.email}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PaymentDetailsDialog;
