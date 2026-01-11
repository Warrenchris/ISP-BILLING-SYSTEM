// src/pages/DataPlans.js - FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Card, CardContent, CardActions,
  Typography, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress,
  Divider, IconButton, Container, Paper, Stack,
  TextField,
  useTheme, alpha, Fade, Slide, Zoom, useMediaQuery,
  Backdrop
} from '@mui/material';
import {
  DataUsage as DataUsageIcon, Star as StarIcon, Add as AddIcon,
  Delete as DeleteIcon, CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  Wifi as WifiIcon, FlashOn as FlashOnIcon,
  Shield as ShieldIcon, Support as SupportIcon,
  Verified as VerifiedIcon
} from '@mui/icons-material';

import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import PlanForm from './PlanForm';

const DataPlans = () => {
  const { dataPlansApi, subscriptionsApi, paymentsApi } = useApi();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  // const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // -----------------------------------------------------------------
  // state
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [subscribing, setSubscribing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'pending', 'completed', 'failed'
  const [phoneNumber, setPhoneNumber] = useState('');

  // Initialize phone number from user profile
  useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  const [openForm, setOpenForm] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // -----------------------------------------------------------------
  // helpers
  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  };

  const getCategoryConfig = (cat) => {
    const configs = {
      basic: {
        color: 'default',
        gradient: `linear-gradient(135deg, ${theme.palette.text.secondary} 0%, ${theme.palette.text.disabled} 100%)`,
        bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.text.secondary, 0.1)} 0%, ${alpha(theme.palette.text.disabled, 0.1)} 100%)`,
        borderColor: theme.palette.text.secondary,
        icon: <DataUsageIcon fontSize="small" />,
        popular: false,
        shadowColor: alpha(theme.palette.text.secondary, 0.3)
      },
      standard: {
        color: 'primary',
        gradient: `linear-gradient(135deg, ${theme.palette.info.main} 0%, ${theme.palette.info.dark} 100%)`,
        bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.1)} 100%)`,
        borderColor: theme.palette.info.main,
        icon: <WifiIcon fontSize="small" />,
        popular: false,
        shadowColor: alpha(theme.palette.info.main, 0.3)
      },
      premium: {
        color: 'secondary',
        gradient: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
        bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.dark, 0.1)} 100%)`,
        borderColor: theme.palette.secondary.main,
        icon: <StarIcon fontSize="small" />,
        popular: true,
        shadowColor: alpha(theme.palette.secondary.main, 0.4)
      },
      enterprise: {
        color: 'warning',
        gradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
        bgGradient: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.15)} 0%, ${alpha(theme.palette.warning.dark, 0.15)} 100%)`,
        borderColor: theme.palette.warning.main,
        icon: <TrendingUpIcon fontSize="small" />,
        popular: false,
        shadowColor: alpha(theme.palette.warning.main, 0.4)
      }
    };
    return configs[cat?.toLowerCase()] || configs.basic;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('KES', 'KSh');
  };

  // -----------------------------------------------------------------
  // fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dataPlansApi.getAll();
      const raw = res?.data?.data;
      const list =
        Array.isArray(raw?.dataPlans) ? raw.dataPlans :
          Array.isArray(raw) ? raw :
            [];

      // Sort plans by price for better presentation
      const sortedPlans = list.sort((a, b) => (a.price || 0) - (b.price || 0));
      setPlans(sortedPlans);
    } catch (err) {
      console.error(err);
      showAlert('Error loading data plans', 'error');
    } finally {
      setLoading(false);
    }
  }, [dataPlansApi]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // -----------------------------------------------------------------
  // subscribe flow
  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setConfirmDialog(true);
  };

  const pollPaymentStatus = async (paymentId) => {
    setPolling(true);
    setPaymentStatus('pending');

    let attempts = 0;
    const maxAttempts = 20; // 1 minute max (3s interval)

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        setPaymentStatus('timeout');
        showAlert('Payment status check timed out. Please check your Dashboard.', 'warning');
        return;
      }

      try {
        const res = await paymentsApi.checkStatus(paymentId);
        const status = res.data?.payment?.status;

        if (status === 'completed') {
          setPolling(false);
          setPaymentStatus('completed');
          showAlert('Payment successful! Subscription active.', 'success');
          // Wait 2s then close
          setTimeout(() => {
            setConfirmDialog(false);
            setSelectedPlan(null);
            setPaymentStatus(null);
          }, 2000);
        } else if (status === 'failed' || status === 'cancelled') {
          setPolling(false);
          setPaymentStatus('failed');
          showAlert('Payment failed. Please try again.', 'error');
        } else {
          // Still pending
          attempts++;
          setTimeout(poll, 3000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Continue polling even on temporary network error
        attempts++;
        setTimeout(poll, 3000);
      }
    };

    poll();
  };

  const confirmSubscription = async () => {
    if (!selectedPlan) return;

    // Basic phone validation
    const phoneRegex = /^(?:254|\+254|0)?(7[0-9]{8})$/;
    if (!phoneNumber || !phoneRegex.test(phoneNumber)) {
      showAlert('Please enter a valid Safaricom number (e.g., 0712345678)', 'warning');
      return;
    }

    try {
      setSubscribing(true);
      // 1. Create Subscription (Pending)
      const subRes = await subscriptionsApi.create({ planId: selectedPlan.id });
      const subscriptionId = subRes.data?.data?.subscription?.id;

      if (!subscriptionId) throw new Error('Failed to create subscription record');

      // 2. Initiate Payment
      const payRes = await paymentsApi.initiateSubscriptionPayment({
        subscriptionId,
        phoneNumber
      });

      const paymentId = payRes.data?.payment?.id;

      showAlert('Payment initiated! Check your phone to enter PIN.', 'success');

      // 3. Start Polling if we have a payment ID
      if (paymentId) {
        setSubscribing(false); // Enable closing if needed, but polling is active
        pollPaymentStatus(paymentId);
      } else {
        setConfirmDialog(false);
        setSelectedPlan(null);
      }

    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Failed to process subscription', 'error');
      setSubscribing(false);
    }
  };

  // -----------------------------------------------------------------
  // delete flow
  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      setDeleting(true);
      await dataPlansApi.delete(planToDelete);
      showAlert('Data plan deleted successfully', 'success');
      fetchPlans();
    } catch (err) {
      console.error(err);
      showAlert(err.response?.data?.message || 'Failed to delete data plan', 'error');
    } finally {
      setDeleting(false);
      setDeleteDialog(false);
      setPlanToDelete(null);
    }
  };

  // -----------------------------------------------------------------
  // Loading skeleton with shimmer effect
  const PlanSkeleton = ({ index }) => (
    <Fade in={true} timeout={300 + index * 100}>
      <Card
        sx={{
          // FIXED: Removed fixed height to allow content to flow naturally
          minHeight: isMobile ? 320 : 360,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(90deg, ${theme.palette.action.hover} 25%, ${theme.palette.action.selected} 50%, ${theme.palette.action.hover} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '-200% 0' },
            '100%': { backgroundPosition: '200% 0' }
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ width: '60%', height: 20, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
            <Box sx={{ width: 50, height: 20, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
          </Box>
          <Box sx={{ width: '40%', height: 16, bgcolor: theme.palette.action.hover, borderRadius: 1, mb: 2 }} />
          <Box sx={{ width: '70%', height: 32, bgcolor: theme.palette.action.hover, borderRadius: 1, mb: 2 }} />
          <Stack spacing={0.5}>
            <Box sx={{ width: '100%', height: 14, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
            <Box sx={{ width: '90%', height: 14, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
            <Box sx={{ width: '95%', height: 14, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
          </Stack>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Box sx={{ width: '100%', height: 32, bgcolor: theme.palette.action.hover, borderRadius: 1 }} />
        </CardActions>
      </Card>
    </Fade>
  );

  // -----------------------------------------------------------------
  // render loading state
  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: alpha(theme.palette.background.default, 0.9),
            backdropFilter: 'blur(10px)',
          }
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
          <Box textAlign="center" mb={6}>
            <Fade in={true} timeout={500}>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                fontWeight="bold"
                gutterBottom
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                ✨ Premium Data Plans
              </Typography>
            </Fade>
            <Fade in={true} timeout={700}>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                Discover lightning-fast internet plans designed for your lifestyle
              </Typography>
            </Fade>
          </Box>

          <Grid container spacing={isMobile ? 2 : 3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={i}>
                <PlanSkeleton index={i} />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    );
  }

  // -----------------------------------------------------------------
  // main render
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: alpha(theme.palette.background.default, 0.95),
          backdropFilter: 'blur(20px)',
        }
      }}
    >
      <Container maxWidth="xl" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        {/* Header Section */}
        <Fade in={true} timeout={500}>
          <Box
            display="flex"
            flexDirection={isMobile ? 'column' : 'row'}
            justifyContent="space-between"
            alignItems={isMobile ? 'center' : 'center'}
            mb={6}
            textAlign={isMobile ? 'center' : 'left'}
          >
            <Box mb={isMobile ? 3 : 0}>
              <Typography
                variant={isMobile ? "h4" : "h3"}
                fontWeight="bold"
                gutterBottom
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                ✨ Premium Data Plans
              </Typography>
              <Typography
                variant={isMobile ? "body1" : "h6"}
                color="text.secondary"
                sx={{ maxWidth: isMobile ? '100%' : 500 }}
              >
                Experience blazing-fast internet with our carefully crafted data plans.
                Choose the perfect plan that fits your digital lifestyle.
              </Typography>
            </Box>

            {user?.role === 'admin' && (
              <Zoom in={true} timeout={700}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenForm(true)}
                  size={isMobile ? "medium" : "large"}
                  sx={{
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                    borderRadius: 3,
                    px: 3,
                    py: 1.5,
                    boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.4)}`,
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Add New Plan
                </Button>
              </Zoom>
            )}
          </Box>
        </Fade>

        {alert.show && (
          <Slide direction="down" in={alert.show} mountOnEnter unmountOnExit>
            <Alert
              severity={alert.severity}
              sx={{
                mb: 4,
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                background: alpha(theme.palette.background.paper, 0.9),
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
              }}
              onClose={() => setAlert({ show: false, message: '', severity: 'info' })}
            >
              {alert.message}
            </Alert>
          </Slide>
        )}

        {/* Plans Grid */}
        <Grid container spacing={isMobile ? 2 : 3}>
          {plans.map((plan, index) => {
            const config = getCategoryConfig(plan.category);
            const isPopular = config.popular;
            const isHovered = hoveredCard === plan.id;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={plan.id}>
                <Fade in={true} timeout={300 + index * 100}>
                  <Card
                    onMouseEnter={() => setHoveredCard(plan.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    sx={{
                      // FIXED: Removed fixed height, use minHeight and auto height
                      minHeight: isMobile ? 320 : 360,
                      height: 'auto', // Allow card to grow with content
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      borderRadius: 4,
                      border: `2px solid ${isPopular ? config.borderColor : 'transparent'}`,
                      background: isHovered ? config.bgGradient : alpha(theme.palette.background.paper, 0.9),
                      backdropFilter: 'blur(20px)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'translateY(-8px) scale(1.02)' : isPopular ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: isHovered
                        ? `0 20px 60px ${config.shadowColor}`
                        : isPopular
                          ? `0 12px 40px ${config.shadowColor}`
                          : `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`,
                      zIndex: isHovered ? 10 : isPopular ? 2 : 1,
                      '&::before': isPopular ? {
                        content: '""',
                        position: 'absolute',
                        top: -2,
                        left: -2,
                        right: -2,
                        bottom: -2,
                        background: config.gradient,
                        borderRadius: 4,
                        zIndex: -1,
                        opacity: 0.8,
                      } : {},
                    }}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <Zoom in={true} timeout={500}>
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 3,
                          }}
                        >
                          <Chip
                            label="🔥 Most Popular"
                            sx={{
                              background: config.gradient,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              px: 2,
                              py: 1,
                              height: 'auto',
                              boxShadow: `0 8px 32px ${config.shadowColor}`,
                              '& .MuiChip-label': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }
                            }}
                          />
                        </Box>
                      </Zoom>
                    )}

                    {/* Admin Delete Button */}
                    {user?.role === 'admin' && (
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => {
                          setPlanToDelete(plan.id);
                          setDeleteDialog(true);
                        }}
                        disabled={deleting}
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          zIndex: 3,
                          width: 32,
                          height: 32,
                          background: alpha(theme.palette.background.paper, 0.9),
                          backdropFilter: 'blur(10px)',
                          '&:hover': {
                            background: 'rgba(244, 67, 54, 0.1)',
                            transform: 'scale(1.1)',
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}

                    <CardContent sx={{
                      flexGrow: 1,
                      p: isMobile ? 2 : 2.5,
                      pb: 1,
                      // FIXED: Ensure content doesn't overflow
                      overflow: 'hidden'
                    }}>
                      {/* Plan Header */}
                      <Box display="flex" alignItems="center" mb={2} mt={isPopular ? 1 : 0}>
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 2,
                            background: config.gradient,
                            color: 'white',
                            mr: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: `0 4px 16px ${config.shadowColor}`,
                          }}
                        >
                          {config.icon}
                        </Box>
                        <Box flex={1}>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            sx={{
                              fontSize: isMobile ? '1rem' : '1.1rem',
                              lineHeight: 1.2,
                              background: config.gradient,
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }}
                          >
                            {plan.name}
                          </Typography>
                          <Chip
                            label={plan.category.toUpperCase()}
                            size="small"
                            sx={{
                              fontSize: '0.7rem',
                              height: 20,
                              mt: 0.5,
                              background: alpha(config.borderColor, 0.1),
                              color: config.borderColor,
                              fontWeight: 'medium',
                              '& .MuiChip-label': { px: 1 }
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Pricing */}
                      <Box mb={2}>
                        <Typography
                          variant="h5"
                          fontWeight="bold"
                          sx={{
                            lineHeight: 1,
                            fontSize: isMobile ? '1.3rem' : '1.5rem',
                            background: config.gradient,
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {formatPrice(plan.price)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                          Valid for {plan.validityPeriod} days
                        </Typography>
                      </Box>

                      {/* Key Features */}
                      <Stack spacing={1} mb={1.5}>
                        <Box display="flex" alignItems="center">
                          <VerifiedIcon sx={{ color: config.borderColor, mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
                            {formatBytes(plan.dataLimit)} Data
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <FlashOnIcon sx={{ color: config.borderColor, mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            Lightning Fast Speed
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <ShieldIcon sx={{ color: config.borderColor, mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            Secure Connection
                          </Typography>
                        </Box>

                        <Box display="flex" alignItems="center">
                          <SupportIcon sx={{ color: config.borderColor, mr: 1, fontSize: 16 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            24/7 Support
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Description */}
                      {plan.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: '0.8rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: 1.3,
                            opacity: 0.8
                          }}
                        >
                          {plan.description}
                        </Typography>
                      )}
                    </CardContent>

                    {/* Action Button - FIXED: Better spacing and positioning */}
                    <CardActions sx={{
                      p: isMobile ? 2 : 2.5,
                      pt: 1,
                      mt: 'auto' // Push button to bottom
                    }}>
                      <Button
                        fullWidth
                        size="medium"
                        variant="contained"
                        onClick={() => handleSubscribe(plan)}
                        disabled={subscribing}
                        sx={{
                          background: config.gradient,
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          borderRadius: 3,
                          py: 1.2,
                          minHeight: 44, // FIXED: Ensure consistent button height
                          boxShadow: `0 8px 32px ${config.shadowColor}`,
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: `0 12px 40px ${config.shadowColor}`,
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                          },
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isPopular ? '🚀 Subscribe Now' : 'Subscribe Now'}
                      </Button>
                    </CardActions>
                  </Card>
                </Fade>
              </Grid>
            );
          })}
        </Grid>

        {/* Empty State */}
        {plans.length === 0 && !loading && (
          <Fade in={true} timeout={500}>
            <Paper
              sx={{
                textAlign: 'center',
                py: 8,
                px: 4,
                borderRadius: 4,
                background: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(20px)',
                border: `2px dashed ${theme.palette.primary.light}`,
                boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.1)}`
              }}
            >
              <DataUsageIcon sx={{ fontSize: 80, color: 'primary.light', mb: 3 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                No Data Plans Available
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                We're crafting amazing data plans just for you. Check back soon!
              </Typography>
              <Button
                variant="contained"
                onClick={fetchPlans}
                startIcon={<DataUsageIcon />}
                sx={{
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  borderRadius: 3,
                  px: 3,
                  py: 1.5,
                  mt: 2
                }}
              >
                Refresh Plans
              </Button>
            </Paper>
          </Fade>
        )}

        {/* Confirm Subscribe Dialog */}
        <Dialog
          open={confirmDialog}
          onClose={() => !subscribing && setConfirmDialog(false)}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Zoom}
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
            }
          }}
          BackdropComponent={Backdrop}
          BackdropProps={{
            sx: {
              background: 'rgba(102, 126, 234, 0.1)',
              backdropFilter: 'blur(10px)'
            }
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h5" fontWeight="bold">
              🎉 Confirm Your Subscription
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {/* Polling / Status UI */}
            {polling ? (
              <Box textAlign="center" py={4}>
                <CircularProgress size={60} thickness={4} sx={{ mb: 3 }} />
                <Typography variant="h6" gutterBottom>
                  Waiting for M-Pesa Payment...
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Please check your phone and enter your PIN.
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                  Do not close this window.
                </Typography>
              </Box>
            ) : paymentStatus === 'completed' ? (
              <Box textAlign="center" py={4}>
                <CheckIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5" color="success.main" gutterBottom>
                  Payment Successful!
                </Typography>
                <Typography variant="body1">
                  Your subscription is now active.
                </Typography>
              </Box>
            ) : (
              // Original Plan Summary UI
              selectedPlan && (
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    background: getCategoryConfig(selectedPlan.category).bgGradient,
                    border: `2px solid ${getCategoryConfig(selectedPlan.category).borderColor}`,
                    boxShadow: `0 8px 32px ${getCategoryConfig(selectedPlan.category).shadowColor}`
                  }}
                >
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {selectedPlan.name}
                  </Typography>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Data Allowance
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatBytes(selectedPlan.dataLimit)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Validity Period
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedPlan.validityPeriod} days
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography
                        variant="h5"
                        fontWeight="bold"
                        sx={{
                          background: getCategoryConfig(selectedPlan.category).gradient,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {formatPrice(selectedPlan.price)}
                      </Typography>
                    </Grid>
                  </Grid>

                  <TextField
                    fullWidth
                    required
                    label="M-Pesa Phone Number"
                    placeholder="0712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    sx={{ mt: 3 }}
                    helperText="Enter the number to receive the M-Pesa prompt"
                  />

                  {selectedPlan.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      {selectedPlan.description}
                    </Typography>
                  )}
                </Paper>
              )
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            {!polling && paymentStatus !== 'completed' && (
              <>
                <Button
                  onClick={() => setConfirmDialog(false)}
                  disabled={subscribing}
                  size="large"
                  sx={{ borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={confirmSubscription}
                  disabled={subscribing}
                  size="large"
                  sx={{
                    minWidth: 140,
                    borderRadius: 2,
                    background: selectedPlan ? getCategoryConfig(selectedPlan.category).gradient : 'linear-gradient(45deg, #667eea, #764ba2)',
                    boxShadow: selectedPlan ? `0 8px 32px ${getCategoryConfig(selectedPlan.category).shadowColor}` : '0 8px 32px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  {subscribing ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    '✨ Confirm Subscription'
                  )}
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* Delete Plan Dialog */}
        <Dialog
          open={deleteDialog}
          onClose={() => !deleting && setDeleteDialog(false)}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          PaperProps={{
            sx: {
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)'
            }
          }}
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="bold">
              🗑️ Delete Data Plan
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography paragraph>
              Are you sure you want to delete this data plan? This action cannot be undone.
            </Typography>
            {planToDelete && (
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  background: 'rgba(255, 193, 7, 0.1)',
                  border: '1px solid rgba(255, 193, 7, 0.3)'
                }}
              >
                <Typography fontWeight="medium">
                  Plan: {plans.find(p => p.id === planToDelete)?.name}
                </Typography>
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={() => setDeleteDialog(false)}
              disabled={deleting}
              size="large"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDeletePlan}
              disabled={deleting}
              size="large"
              sx={{
                minWidth: 100,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #f44336, #d32f2f)',
                boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)'
              }}
            >
              {deleting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Delete'
              )}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Admin Add/Edit Dialog */}
        <PlanForm
          open={openForm}
          onClose={() => setOpenForm(false)}
          onSaved={() => {
            setOpenForm(false);
            fetchPlans();
            showAlert('Plan saved successfully! 🎉', 'success');
          }}
        />
      </Container>
    </Box >
  );
};

export default DataPlans;