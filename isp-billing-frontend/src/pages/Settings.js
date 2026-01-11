import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Switch, FormControlLabel, Button, Divider, LinearProgress, Alert, Snackbar
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useApi } from '../contexts/ApiContext';

const Settings = () => {
    const theme = useTheme();
    const { settingService } = useApi();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    const [companyInfo, setCompanyInfo] = useState({ name: '', email: '', phone: '', address: '' });
    const [paymentSettings, setPaymentSettings] = useState({ mpesaEnabled: false, cashEnabled: false, paybill: '', accountPrefix: '' });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                // Fetch settings from API
                const [companyRes, paymentRes] = await Promise.allSettled([
                    settingService.getCompanyInfo(),
                    settingService.getPaymentSettings()
                ]);

                if (companyRes.status === 'fulfilled') {
                    setCompanyInfo(companyRes.value.data?.data || companyRes.value.data || {});
                }

                if (paymentRes.status === 'fulfilled') {
                    setPaymentSettings(paymentRes.value.data?.data || paymentRes.value.data || {});
                }

                // If failed, we just leave defaults or previous state
            } catch (err) {
                console.error('Failed to load settings:', err);
                setError('Failed to load some settings.');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [settingService]);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save both sections
            await Promise.all([
                settingService.updateCompanyInfo(companyInfo),
                settingService.updatePaymentSettings(paymentSettings)
            ]);
            setSnackbar({ open: true, message: 'Settings saved successfully!', severity: 'success' });
        } catch (err) {
            console.error('Failed to save settings:', err);
            setSnackbar({ open: true, message: 'Failed to save settings.', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

    if (loading) return <LinearProgress />;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 4 }}>System Settings</Typography>

            {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={4}>
                {/* Company Info */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: '100%', background: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" gutterBottom>Company Information</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>Details shown on invoices and customer communications</Typography>
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField label="Company Name" fullWidth value={companyInfo.name} onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })} />
                            <TextField label="Email Address" fullWidth value={companyInfo.email} onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })} />
                            <TextField label="Phone Number" fullWidth value={companyInfo.phone} onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })} />
                            <TextField label="Address" multiline rows={2} fullWidth value={companyInfo.address} onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })} />
                        </Box>
                    </Paper>
                </Grid>

                {/* Payment Settings */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: '16px', height: '100%', background: alpha(theme.palette.background.paper, 0.6) }}>
                        <Typography variant="h6" gutterBottom>Payment Configuration</Typography>
                        <Typography variant="body2" color="text.secondary" mb={3}>Manage M-Pesa and invoice settings</Typography>

                        <FormControlLabel
                            control={<Switch checked={paymentSettings.mpesaEnabled} onChange={(e) => setPaymentSettings({ ...paymentSettings, mpesaEnabled: e.target.checked })} />}
                            label="Enable M-Pesa Payments"
                            sx={{ mb: 1, display: 'block' }}
                        />
                        <FormControlLabel
                            control={<Switch checked={paymentSettings.cashEnabled} onChange={(e) => setPaymentSettings({ ...paymentSettings, cashEnabled: e.target.checked })} />}
                            label="Enable Cash Payments"
                            sx={{ mb: 3, display: 'block' }}
                        />

                        <Divider sx={{ my: 2 }} />

                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField label="M-Pesa Paybill / Till Number" fullWidth value={paymentSettings.paybill} onChange={(e) => setPaymentSettings({ ...paymentSettings, paybill: e.target.value })} />
                            <TextField label="Account Number Prefix (Optional)" fullWidth value={paymentSettings.accountPrefix} onChange={(e) => setPaymentSettings({ ...paymentSettings, accountPrefix: e.target.value })} />
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Box display="flex" justifyContent="flex-end">
                        <Button
                            variant="contained"
                            startIcon={<SaveIcon />}
                            size="large"
                            sx={{ borderRadius: '12px' }}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </Box>
                </Grid>
            </Grid>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Settings;
