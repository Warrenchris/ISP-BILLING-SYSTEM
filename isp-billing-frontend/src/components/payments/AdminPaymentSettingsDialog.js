import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Avatar,
    Box,
    FormControlLabel,
    Switch,
    useTheme
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';

const AdminPaymentSettingsDialog = ({
    open,
    onClose,
    cashPaymentEnabled,
    setCashPaymentEnabled,
    mpesaDebugMode,
    setMpesaDebugMode,
    onSave
}) => {
    const theme = useTheme();
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
                    
                    color: 'text.primary'
                } }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Avatar
                    sx={{
                        width: 64,
                        height: 64,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        margin: '0 auto 16px' }}
                >
                    <SettingsIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Typography variant="h5" fontWeight={600}>
                    Payment Settings
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Box display="flex" flexDirection="column" gap={3}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={cashPaymentEnabled}
                                onChange={(e) => setCashPaymentEnabled(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Enable Cash Payments"
                    />

                    <FormControlLabel
                        control={
                            <Switch
                                checked={mpesaDebugMode}
                                onChange={(e) => setMpesaDebugMode(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box>
                                <Typography>M-Pesa Debug Mode</Typography>
                                <Typography variant="caption" color="gray">Logs transaction details to console</Typography>
                            </Box>
                        }
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    sx={{ color: 'gray', borderColor: 'gray' }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onSave}
                    sx={{
                        
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'text.primary',
                        '&:hover': {
                            background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)` }
                    }}
                >
                    Save Settings
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AdminPaymentSettingsDialog;
