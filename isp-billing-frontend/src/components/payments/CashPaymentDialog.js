import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Avatar,
    CircularProgress,
    Autocomplete,
    Grid,
    Box,
    useTheme
} from '@mui/material';
import { MonetizationOn as CashIcon } from '@mui/icons-material';
import { APP_DEFAULT_CURRENCY, formatCurrency } from '../../utils/helpers';

const currencyFieldSuffix = () => APP_DEFAULT_CURRENCY;

const CashPaymentDialog = ({
    open,
    onClose,
    onPay,
    processing,
    users,
    selectedUser,
    setSelectedUser,
    userSearchLoading,
    loadingSubscription,
    userSubscription,
    cashAmount,
    setCashAmount,
    cashReference,
    setCashReference,
    cashDescription,
    setCashDescription
}) => {
    const theme = useTheme();
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'rgba(26, 26, 46, 0.95)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    color: 'text.primary'
                } }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Avatar
                    sx={{
                        width: 64,
                        height: 64,
                        background: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`, // Blue-ish for Cash
                        margin: '0 auto 16px' }}
                >
                    <CashIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={600}>
                    Record Cash Payment
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" color="gray" sx={{ mb: 3, textAlign: 'center' }}>
                    Manually record a cash payment received from a customer.
                </Typography>

                <Autocomplete
                    options={users}
                    getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
                    value={selectedUser}
                    onChange={(event, newValue) => setSelectedUser(event, newValue)}
                    loading={userSearchLoading}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            label="Select Customer"
                            placeholder="Search by name or email"
                            sx={{ mb: 3 }}
                            InputLabelProps={{ style: { color: '#aaa' } }}
                            InputProps={{
                                ...params.InputProps,
                                style: { color: 'text.primary' },
                                endAdornment: (
                                    <React.Fragment>
                                        {userSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ) }}
                        />
                    )}
                    sx={{ mb: 3 }}
                />

                {loadingSubscription && (
                    <Box display="flex" justifyContent="center" mb={2}>
                        <CircularProgress size={20} />
                    </Box>
                )}

                {userSubscription && (
                    <Box
                        sx={{
                            p: 3,
                            mb: 3,
                            
                            background: 'rgba(0, 212, 170, 0.1)',
                            border: '1px solid rgba(0, 212, 170, 0.2)' }}
                    >
                        <Typography variant="subtitle2" gutterBottom sx={{ color: 'success.main' }}>
                            Active Subscription Found
                        </Typography>
                        <Typography variant="body2" color="gray">
                            {userSubscription.DataPlan?.name || 'Subscription'} -{' '}
                            {formatCurrency(userSubscription.DataPlan?.price ?? userSubscription.amount ?? 0, undefined, undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                        </Typography>
                    </Box>
                )}

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label={`Amount (${currencyFieldSuffix()})`}
                            type="number"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="1000"
                            sx={{ mb: 2 }}
                            InputLabelProps={{ style: { color: '#aaa' } }}
                            InputProps={{ style: { color: 'text.primary' } }}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                            fullWidth
                            label="Reference Number"
                            value={cashReference}
                            onChange={(e) => setCashReference(e.target.value)}
                            placeholder="CASH-001"
                            sx={{ mb: 2 }}
                            InputLabelProps={{ style: { color: '#aaa' } }}
                            InputProps={{ style: { color: 'text.primary' } }}
                        />
                    </Grid>
                </Grid>

                <TextField
                    fullWidth
                    label="Description (Optional)"
                    multiline
                    rows={2}
                    value={cashDescription}
                    onChange={(e) => setCashDescription(e.target.value)}
                    placeholder="Payment description..."
                    InputLabelProps={{ style: { color: '#aaa' } }}
                    InputProps={{ style: { color: 'text.primary' } }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={processing}
                    variant="outlined"
                    sx={{ color: 'gray', borderColor: 'gray' }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onPay}
                    disabled={processing || !selectedUser || !cashAmount || !cashReference}
                    sx={{
                        
                        background: `linear-gradient(135deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`,
                        color: 'text.primary',
                        px: 3,
                        '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)` }
                    }}
                >
                    {processing ? <CircularProgress size={20} color="inherit" /> : 'Record Payment'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CashPaymentDialog;
