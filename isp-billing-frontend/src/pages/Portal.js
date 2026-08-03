import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ShoppingBag as ShoppingIcon,
  QrCode as VoucherIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// Import the modern logo if available, otherwise fallback
import ispLogo from '../pics/isp_logo.png';

export default function Portal() {
  const theme = useTheme();
  const [searchParams] = useSearchParams();

  // MikroTik Hotspot Query Parameters
  const linkLoginOnly = searchParams.get('link-login-only') || searchParams.get('link-login');
  const mac = searchParams.get('mac') || '';
  const dst = searchParams.get('dst') || 'http://google.com';
  const routerError = searchParams.get('error') || '';

  // Tab State: 0 = Redeem Code, 1 = Buy Voucher
  const [activeTab, setActiveTab] = useState(0);

  // Form inputs
  const [voucherCode, setVoucherCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);

  // States
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Polling STK push State
  const [pollingOpen, setPollingOpen] = useState(false);
  const [pollingStatus, setPollingStatus] = useState('pending'); // pending, completed, failed
  const [pollTimer, setPollTimer] = useState(null);
  const [generatedVoucher, setGeneratedVoucher] = useState(null);

  // Hidden Handshake Form submission details
  const [handshakeData, setHandshakeData] = useState(null);

  const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // Load active data plans on boot
  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const res = await axios.get(`${backendUrl}/plans?active=true&limit=20`);
        const allPlans = res.data?.data?.plans || [];
        // Filter out plans that aren't hotspot categories, or show all prepaid plans
        setPlans(allPlans);
        if (allPlans.length > 0) {
          setSelectedPlan(allPlans[0]);
        }
      } catch (err) {
        console.error('Failed to load data plans:', err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [backendUrl]);

  // Display error redirected from router
  useEffect(() => {
    if (routerError) {
      setAlert({ severity: 'error', message: `Router error: ${routerError}` });
    }
  }, [routerError]);

  // Clean up polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollTimer]);

  // Handle direct voucher redemption
  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      setAlert({ severity: 'error', message: 'Please enter a valid voucher code' });
      return;
    }

    setActionLoading(true);
    setAlert(null);

    try {
      // Formats customer details for anonymous voucher registration
      const redeemRes = await axios.post(`${backendUrl}/vouchers/redeem`, {
        code: voucherCode.trim(),
        customerId: `guest-${mac.replace(/:/g, '') || Date.now()}`, // phone-keyed or fallback mac ID
        networkDeviceId: 'hotspot-router',
      });

      const { radiusUsername, radiusPassword } = redeemRes.data.data;

      setAlert({ severity: 'success', message: 'Voucher redeemed successfully! Connecting you online...' });

      // Trigger hidden MikroTik hotspot servlet POST
      submitRouterHandshake(radiusUsername, radiusPassword);

    } catch (err) {
      setAlert({
        severity: 'error',
        message: err.response?.data?.message || 'Invalid voucher code or connection error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle M-Pesa STK Purchase
  const handleBuyNow = async (e) => {
    e.preventDefault();
    if (!phoneNumber) {
      setAlert({ severity: 'error', message: 'Please enter your M-Pesa phone number' });
      return;
    }
    if (!selectedPlan) {
      setAlert({ severity: 'error', message: 'Please select a internet plan' });
      return;
    }

    setActionLoading(true);
    setAlert(null);

    try {
      const res = await axios.post(`${backendUrl}/vouchers/purchase-stk`, {
        phone: phoneNumber,
        planId: selectedPlan.id,
      });

      const payment = res.data.payment;
      if (payment && payment.id) {
        // Start polling payment status with IDOR protection params
        startPolling(payment.id, payment.phoneNumber);
      } else {
        throw new Error('Payment response missing transaction ID');
      }

    } catch (err) {
      setAlert({
        severity: 'error',
        message: err.response?.data?.message || 'Failed to initiate M-Pesa STK push. Try again.',
      });
      setActionLoading(false);
    }
  };

  // Secure status polling (requires phone query param to prevent IDOR attacks)
  const startPolling = (paymentId, phone) => {
    setPollingOpen(true);
    setPollingStatus('pending');
    setGeneratedVoucher(null);

    let secondsElapsed = 0;
    const interval = setInterval(async () => {
      secondsElapsed += 3;
      if (secondsElapsed > 120) { // 2 minutes timeout
        clearInterval(interval);
        setPollingStatus('failed');
        setActionLoading(false);
        return;
      }

      try {
        // IDOR Verification Guard: pass query phone number matching payment record
        const statusRes = await axios.get(
          `${backendUrl}/vouchers/payment-status/${paymentId}?phone=${encodeURIComponent(phone)}`
        );

        const status = statusRes.data.status;
        const code = statusRes.data.voucherCode;

        if (status === 'completed') {
          clearInterval(interval);
          setPollingStatus('completed');
          setGeneratedVoucher(code);
          setActionLoading(false);

          // Auto-trigger redemption process
          redeemGeneratedVoucher(code);
        } else if (status === 'failed') {
          clearInterval(interval);
          setPollingStatus('failed');
          setActionLoading(false);
        }
      } catch (err) {
        console.error('Polling error:', err.message);
      }
    }, 3000);

    setPollTimer(interval);
  };

  // Redeems code automatically after successful remote M-Pesa payment
  const redeemGeneratedVoucher = async (code) => {
    try {
      const redeemRes = await axios.post(`${backendUrl}/vouchers/redeem`, {
        code: code,
        customerId: `guest-${mac.replace(/:/g, '') || Date.now()}`,
        networkDeviceId: 'hotspot-router',
      });

      const { radiusUsername, radiusPassword } = redeemRes.data.data;
      
      // Enqueue form submission to get them through the hotspot
      setTimeout(() => {
        submitRouterHandshake(radiusUsername, radiusPassword);
      }, 3000);

    } catch (err) {
      console.error('Failed to auto-redeem generated voucher:', err.message);
    }
  };

  // Submits the credentials back to MikroTik RouterOS servlet
  const submitRouterHandshake = (username, password) => {
    // Fallback: If redirected outside the hotspot, use gateway standard IP
    const loginServletUrl = linkLoginOnly || 'http://10.5.50.1/login';

    setHandshakeData({
      action: loginServletUrl,
      username: username,
      password: password,
      dst: dst,
    });
  };

  // Auto-submit form when handshakeData is ready
  useEffect(() => {
    if (handshakeData) {
      document.getElementById('hotspot-handshake-form').submit();
    }
  }, [handshakeData]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `radial-gradient(circle at 10% 20%, ${alpha(theme.palette.primary.light, 0.15)} 0%, ${alpha(theme.palette.background.default, 1)} 90%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Box textAlign="center" mb={4}>
          <Box display="flex" justifyContent="center" mb={2}>
            <img src={ispLogo} alt="ISP Logo" style={{ height: 64, objectFit: 'contain' }} onError={(e) => {
              e.target.style.display = 'none'; // Hide if missing
            }} />
          </Box>
          <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
            WiFi Hotspot Login
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect to our ultra-fast internet network
          </Typography>
        </Box>

        {alert && (
          <Alert severity={alert.severity} sx={{ mb: 3, borderRadius: '12px' }}>
            {alert.message}
          </Alert>
        )}

        <Card
          sx={{
            borderRadius: '24px',
            border: `1px solid ${theme.palette.custom.borderDefault}`,
            boxShadow: '0 8px 32px 0 rgba(188, 129, 63, 0.08)',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{ borderBottom: `1px solid ${theme.palette.custom.borderDefault}` }}
          >
            <Tab icon={<VoucherIcon />} label="Use Voucher" sx={{ py: 2, fontWeight: 600 }} />
            <Tab icon={<ShoppingIcon />} label="Buy Voucher" sx={{ py: 2, fontWeight: 600 }} />
          </Tabs>

          <CardContent sx={{ p: 4 }}>
            {activeTab === 0 ? (
              <Box component="form" onSubmit={handleRedeem}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Enter your 8-digit prepaid voucher code below to get connected.
                </Typography>
                <TextField
                  fullWidth
                  placeholder="e.g. XKPF-3N7W"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  disabled={actionLoading}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                  slotProps={{
                    htmlInput: { style: { textTransform: 'uppercase', textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold' } }
                  }}
                />
                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={actionLoading}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    fontWeight: 500,
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                  }}
                >
                  {actionLoading ? <CircularProgress size={24} color="inherit" /> : 'Connect Online'}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleBuyNow}>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Choose an internet package and pay securely via M-Pesa.
                </Typography>

                {loadingPlans ? (
                  <Box textAlign="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Grid container spacing={2} mb={3}>
                    {plans.map((p) => (
                      <Grid item xs={6} key={p.id}>
                        <Card
                          variant="outlined"
                          onClick={() => setSelectedPlan(p)}
                          sx={{
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            borderColor: selectedPlan?.id === p.id ? theme.palette.primary.main : theme.palette.custom.borderDefault,
                            backgroundColor: selectedPlan?.id === p.id ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                            '&:hover': {
                              borderColor: theme.palette.primary.main,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {p.name}
                            </Typography>
                            <Typography variant="h6" color="primary" fontWeight={800} mt={1}>
                              KES {p.price}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Speed: {p.speed || 'Best effort'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                <TextField
                  fullWidth
                  type="tel"
                  label="M-Pesa Phone Number"
                  placeholder="e.g. 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={actionLoading}
                  sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                    },
                  }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={actionLoading || loadingPlans}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    fontWeight: 500,
                  }}
                >
                  {actionLoading ? <CircularProgress size={24} color="inherit" /> : `Buy Now — KES ${selectedPlan?.price || 0}`}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Live Polling STK push progress Dialog */}
      <Dialog
        open={pollingOpen}
        onClose={() => pollingStatus !== 'pending' && setPollingOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 2 } }}
      >
        <DialogTitle textAlign="center" fontWeight={700}>
          {pollingStatus === 'pending' && 'Processing M-Pesa STK Push'}
          {pollingStatus === 'completed' && 'Payment Successful'}
          {pollingStatus === 'failed' && 'Payment Failed'}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" alignItems="center" py={3} textAlign="center">
            {pollingStatus === 'pending' && (
              <>
                <CircularProgress size={56} sx={{ mb: 3 }} />
                <Typography variant="body1" fontWeight={600} gutterBottom>
                  Please check your phone...
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  A secure M-Pesa prompt has been sent to **{phoneNumber}**. Enter your PIN to complete purchase.
                </Typography>
                <LinearProgress sx={{ width: '100%', mt: 2, borderRadius: '4px' }} />
              </>
            )}

            {pollingStatus === 'completed' && (
              <>
                <SuccessIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Voucher: {generatedVoucher}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Your voucher code has been successfully generated and delivered by SMS. 
                </Typography>
                <Typography variant="body2" fontWeight={600} color="primary">
                  Connecting you online now...
                </Typography>
              </>
            )}

            {pollingStatus === 'failed' && (
              <>
                <WarningIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
                <Typography variant="body2" color="text.secondary" paragraph>
                  The payment prompt was cancelled, timed out, or rejected by M-Pesa. Please verify your balance and try again.
                </Typography>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button
            onClick={() => setPollingOpen(false)}
            disabled={pollingStatus === 'pending'}
            variant="contained"
            sx={{ px: 4, borderRadius: '8px' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden POST action targeting MikroTik router servlet */}
      {handshakeData && (
        <form
          id="hotspot-handshake-form"
          action={handshakeData.action}
          method="POST"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="username" value={handshakeData.username} />
          <input type="hidden" name="password" value={handshakeData.password} />
          <input type="hidden" name="dst" value={handshakeData.dst} />
          <input type="hidden" name="popup" value="true" />
        </form>
      )}
    </Box>
  );
}
