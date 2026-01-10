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
    CircularProgress
} from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';

const MpesaPaymentDialog = ({
    open,
    onClose,
    onPay,
    processing,
    phoneNumber,
    setPhoneNumber,
    amount,
    setAmount
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'rgba(26, 26, 46, 0.95)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    color: 'white'
                },
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Avatar
                    sx={{
                        width: 64,
                        height: 64,
                        background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)', // MPESA Green-ish
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 20px rgba(0, 212, 170, 0.3)'
                    }}
                >
                    <PhoneIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={600}>
                    M-Pesa Payment
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" color="gray" sx={{ mb: 3, textAlign: 'center' }}>
                    Enter your M-Pesa details to initiate a payment prompt on your phone.
                </Typography>

                <TextField
                    fullWidth
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0712345678"
                    sx={{ mb: 3 }}
                    helperText="M-Pesa registered number"
                    InputLabelProps={{ style: { color: '#aaa' } }}
                    InputProps={{ style: { color: 'white' } }}
                />

                <TextField
                    fullWidth
                    label="Amount (KSh)"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    sx={{ mb: 2 }}
                    helperText="Min: 1 KSh, Max: 150,000 KSh"
                    InputLabelProps={{ style: { color: '#aaa' } }}
                    InputProps={{ style: { color: 'white' } }}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
                <Button
                    onClick={onClose}
                    disabled={processing}
                    sx={{ color: 'gray', borderColor: 'gray' }}
                    variant="outlined"
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onPay}
                    disabled={processing || !phoneNumber || !amount}
                    sx={{
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
                        color: 'white',
                        px: 4,
                        '&:hover': {
                            background: 'linear-gradient(135deg, #0ceebf 0%, #00d4aa 100%)',
                        },
                    }}
                >
                    {processing ? <CircularProgress size={20} color="inherit" /> : 'Pay Now'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MpesaPaymentDialog;
