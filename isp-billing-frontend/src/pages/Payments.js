import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Autocomplete,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Payment as PaymentIcon,
  Phone as PhoneIcon,
  Receipt as ReceiptIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  MonetizationOn as CashIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Subscriptions as SubscriptionIcon,
  AccountCircle as UserIcon,
  ReceiptLong as ReceiptLongIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';

import MoneyIcon from '@mui/icons-material/AttachMoney';

const formatCurrency = (amount) => {
  const num = Number(String(amount).replace(/[^\d.-]/g, ''));
  return isNaN(num) ? '0.00' : num.toLocaleString('en-KE', { minimumFractionDigits: 2 });
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const d = new Date(date);
    
    if (isNaN(d.getTime())) {
      const parsedDate = Date.parse(date);
      if (!isNaN(parsedDate)) {
        return new Date(parsedDate).toLocaleDateString('en-KE', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        return 'N/A';
      }
    }
    
    return d.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Helper function to get payment method from payment data
const getPaymentMethod = (payment) => {
  // Check various possible fields for payment method
  if (payment.method) return payment.method;
  if (payment.paymentMethod) return payment.paymentMethod;
  if (payment.type) return payment.type;
  
  // Determine method from transaction ID or reference
  const transactionId = payment.transactionId || payment.reference || payment.id || '';
  if (transactionId.toLowerCase().includes('cash')) return 'Cash';
  if (transactionId.toLowerCase().includes('mpesa') || transactionId.toLowerCase().includes('m-pesa')) return 'M-Pesa';
  if (transactionId.toLowerCase().includes('bank')) return 'Bank';
  if (transactionId.toLowerCase().includes('card')) return 'Card';
  
  // Default based on phone number presence
  if (payment.phoneNumber || payment.phone) return 'M-Pesa';
  
  return 'Cash'; // Default fallback
};

// Helper function to get payment date
const getPaymentDate = (payment) => {
  // Check various possible date fields
  const dateFields = ['createdAt', 'created_at', 'date', 'timestamp', 'paymentDate', 'transactionDate'];
  
  for (const field of dateFields) {
    if (payment[field]) {
      return payment[field];
    }
  }
  
  return new Date().toISOString(); // Current date as fallback
};

// Helper function to get customer info
const getCustomerInfo = (payment) => {
  if (payment.customerInfo) return payment.customerInfo;
  if (payment.customer) return payment.customer;
  if (payment.user) {
    return {
      name: `${payment.user.firstName || ''} ${payment.user.lastName || ''}`.trim() || payment.user.email || 'Unknown',
      email: payment.user.email
    };
  }
  
  // Try to construct from individual fields
  const firstName = payment.firstName || payment.first_name || '';
  const lastName = payment.lastName || payment.last_name || '';
  const email = payment.email || payment.userEmail || '';
  
  if (firstName || lastName || email) {
    return {
      name: `${firstName} ${lastName}`.trim() || email || 'Unknown',
      email: email
    };
  }
  
  return { name: 'Unknown', email: '' };
};

const Payments = () => {
  const theme = useTheme();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mpesaDialog, setMpesaDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState(false);
  const [adminSettingsDialog, setAdminSettingsDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReference, setCashReference] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [mpesaDebugMode, setMpesaDebugMode] = useState(false);
  const [cashPaymentEnabled, setCashPaymentEnabled] = useState(false);
  const [mpesaRetryCount, setMpesaRetryCount] = useState(0);
  const [paymentDetailsModal, setPaymentDetailsModal] = useState({
    open: false,
    payment: null,
  });
  
  // User selection for cash payments
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const { paymentsApi, adminApi } = useApi();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPayments();
    if (isAdmin) {
      loadAdminSettings();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = isAdmin ? await paymentsApi.getAllPayments() : await paymentsApi.getPaymentHistory();
      const paymentsData = response.data.data || response.data.payments || [];
      
      // Process payments to ensure consistent data structure
      const processedPayments = paymentsData.map((payment, index) => ({
        id: payment.id || `payment-${index}`,
        transactionId: payment.transactionId || payment.reference || payment.id || `TXN-${Date.now()}-${index}`,
        amount: payment.amount || 0,
        method: getPaymentMethod(payment),
        status: payment.status || 'pending',
        createdAt: getPaymentDate(payment),
        customerInfo: getCustomerInfo(payment),
        subscriptionId: payment.subscriptionId || null,
        description: payment.description || 'Payment for ISP services',
        phoneNumber: payment.phoneNumber || payment.phone,
        // Include original payment data for reference
        ...payment
      }));
      
      console.log('Processed payments:', processedPayments); // Debug log
      setPayments(processedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      showAlert("Error loading payments", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    try {
      setProcessing(true);
      
      const confirmResponse = await paymentsApi.confirmPayment(paymentId);
      const payment = payments.find(p => p.id === paymentId);
      
      if (payment?.subscriptionId) {
        const subResponse = await paymentsApi.verifySubscriptionPayment(payment.subscriptionId);
        
        if (subResponse.data.isFullyPaid) {
          await paymentsApi.activateSubscription(payment.subscriptionId);
          showAlert("Payment confirmed and subscription activated!", "success");
        } else {
          showAlert("Payment confirmed but subscription not fully paid yet", "info");
        }
      } else {
        showAlert("Payment confirmed successfully!", "success");
      }
      
      fetchPayments();
      if (selectedUser) {
        fetchUserSubscription(selectedUser.id);
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
      showAlert(error.response?.data?.message || "Failed to confirm payment", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      setProcessing(true);
      await paymentsApi.rejectPayment(paymentId);
      showAlert("Payment rejected successfully", "success");
      fetchPayments();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      showAlert(error.response?.data?.message || "Failed to reject payment", "error");
    } finally {
      setProcessing(false);
    }
  };

  const openPaymentDetails = (payment) => {
    setPaymentDetailsModal({
      open: true,
      payment,
    });
  };

  const fetchUsers = async () => {
    try {
      setUserSearchLoading(true);
      const response = await adminApi.users.getAll();
      const userData = response.data?.data?.users || [];
      setUsers(userData);
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert('Error loading users', 'error');
    } finally {
      setUserSearchLoading(false);
    }
  };

  const fetchUserSubscription = async (userId) => {
    try {
      setLoadingSubscription(true);
      const response = await adminApi.users.getUserSubscription(userId);
      
      let subscription = null;
      if (response.data?.data?.subscriptions) {
        subscription = response.data.data.subscriptions.find(sub => 
          sub.status === 'active' && 
          new Date(sub.endDate) > new Date()
        );
      } else if (response.data?.subscription) {
        subscription = response.data.subscription;
      }

      if (subscription) {
        setUserSubscription(subscription);
        const amount = subscription.DataPlan?.price || 
                      subscription.plan?.price || 
                      subscription.amount || 
                      0;
        
        setCashAmount(amount.toString());
        setCashDescription(
          `Payment for ${subscription.DataPlan?.name || subscription.plan?.name || 'ISP services'} - ${selectedUser?.firstName} ${selectedUser?.lastName}`
        );
      } else {
        setUserSubscription(null);
        setCashAmount('');
        setCashDescription(
          `Cash payment for ISP services - ${selectedUser?.firstName} ${selectedUser?.lastName}`
        );
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      setUserSubscription(null);
      setCashAmount('');
      
      if (error.response?.status !== 404) {
        showAlert('Error loading subscription details', 'error');
      }
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const settings = await adminApi.settings?.getPaymentSettings() || {};
      setCashPaymentEnabled(settings.cashPaymentEnabled || false);
      setMpesaDebugMode(settings.mpesaDebugMode || false);
    } catch (error) {
      console.error('Error loading admin settings:', error);
    }
  };

  const saveAdminSettings = async () => {
    try {
      await adminApi.settings?.updatePaymentSettings({
        cashPaymentEnabled,
        mpesaDebugMode,
      });
      showAlert('Payment settings updated successfully', 'success');
      setAdminSettingsDialog(false);
    } catch (error) {
      console.error('Error saving admin settings:', error);
      showAlert('Failed to update payment settings', 'error');
    }
  };

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };

  const validatePhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/\s+/g, '');
    const patterns = [
      /^254[17]\d{8}$/,
      /^0[17]\d{8}$/,
      /^\+254[17]\d{8}$/,
    ];
    return patterns.some(pattern => pattern.test(cleanPhone));
  };

  const formatPhoneNumber = (phone) => {
    const cleanPhone = phone.replace(/[\s+]/g, '');
    if (cleanPhone.startsWith('0')) {
      return '254' + cleanPhone.slice(1);
    }
    if (cleanPhone.startsWith('254')) {
      return cleanPhone;
    }
    return cleanPhone;
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber || !amount) {
      showAlert('Please fill in all fields', 'warning');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      showAlert('Please enter a valid Kenyan phone number (e.g., 0712345678)', 'warning');
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount < 1) {
      showAlert('Amount must be at least KSh 1', 'warning');
      return;
    }

    if (numAmount > 150000) {
      showAlert('Amount cannot exceed KSh 150,000 per transaction', 'warning');
      return;
    }

    try {
      setProcessing(true);
      const formattedPhone = phoneNumber.replace(/^0/, '254');
      
      if (mpesaDebugMode) {
        console.log('M-Pesa Debug Info:', {
          originalPhone: phoneNumber,
          formattedPhone,
          amount: numAmount,
          timestamp: new Date().toISOString(),
        });
      }

      const paymentData = {
        phoneNumber: formattedPhone,
        amount: numAmount,
        description: 'ISP Billing Payment',
        accountReference: `ISP-${Date.now()}`,
        transactionDesc: `Payment for ISP services - ${user?.email || 'User'}`,
      };

      const response = await paymentsApi.initiateMpesa(paymentData);

      if (response.data?.success) {
        showAlert('M-Pesa payment initiated! Please check your phone for the payment prompt.', 'success');
        setMpesaDialog(false);
        setPhoneNumber('');
        setAmount('');
        setMpesaRetryCount(0);
        
        setTimeout(() => {
          fetchPayments();
        }, 3000);
      } else {
        throw new Error(response.data?.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      
      let errorMessage = 'Failed to initiate M-Pesa payment';
      
      if (error.response?.status === 400) {
        errorMessage = 'Invalid payment details. Please check your phone number and amount.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.response?.status === 503) {
        errorMessage = 'M-Pesa service is temporarily unavailable. Please try again later.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      showAlert(errorMessage, 'error');
      
      if (error.response?.status === 503 && mpesaRetryCount < 2) {
        setMpesaRetryCount(prev => prev + 1);
        showAlert(`Retrying M-Pesa payment... (Attempt ${mpesaRetryCount + 2}/3)`, 'info');
        setTimeout(() => {
          handleMpesaPayment();
        }, 2000);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    if (!selectedUser || !cashAmount || !cashReference) {
      showAlert('Please select a user and fill in all required fields', 'warning');
      return;
    }

    const numAmount = parseFloat(cashAmount);
    if (numAmount < 1) {
      showAlert('Amount must be at least KSh 1', 'warning');
      return;
    }

    try {
      setProcessing(true);
      
      const finalDescription = cashDescription || `Cash payment for ISP services - ${selectedUser.firstName} ${selectedUser.lastName}`;
      
      const cashPaymentData = {
        userId: selectedUser.id,
        amount: numAmount,
        reference: cashReference,
        description: finalDescription,
        subscriptionId: userSubscription?.id || null,
        activateSubscription: true
      };

      const response = await paymentsApi.createCashPayment(cashPaymentData);
      
      if (response.data?.success) {
        let alertMessage = `Cash payment recorded successfully for ${selectedUser.firstName} ${selectedUser.lastName}`;
        
        if (response.data.data?.subscriptionActivated) {
          alertMessage += " and subscription activated!";
        }
        
        showAlert(alertMessage, "success");
        setCashDialog(false);
        resetCashPaymentForm();
        fetchPayments();
        
        if (userSubscription?.id) {
          fetchUserSubscription(selectedUser.id);
        }
      } else {
        throw new Error(response.data?.message || 'Failed to record cash payment');
      }
    } catch (error) {
      console.error('Cash payment error:', error);
      showAlert(error.response?.data?.message || 'Failed to record cash payment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const resetCashPaymentForm = () => {
    setSelectedUser(null);
    setCashAmount('');
    setCashReference('');
    setCashDescription('');
    setUserSubscription(null);
  };

  const handleUserSelection = (event, newValue) => {
    setSelectedUser(newValue);
    if (newValue) {
      fetchUserSubscription(newValue.id);
      const refNumber = `CASH-${newValue.id}-${Date.now().toString().slice(-6)}`;
      setCashReference(refNumber);
    } else {
      setUserSubscription(null);
      setCashAmount('');
      setCashReference('');
      setCashDescription('');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: '#00d4aa',
      pending: '#ffb800',
      failed: '#ff6b6b',
      cancelled: '#9e9e9e',
    };
    return colors[status] || '#9e9e9e';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: '#00d4aa' }} />;
      case 'pending':
        return <ScheduleIcon sx={{ color: '#ffb800' }} />;
      case 'failed':
      case 'cancelled':
        return <CancelIcon sx={{ color: '#ff6b6b' }} />;
      default:
        return <PaymentIcon />;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'mpesa':
      case 'm-pesa':
        return <PhoneIcon />;
      case 'cash':
        return <CashIcon />;
      case 'bank':
        return <BankIcon />;
      case 'card':
        return <CardIcon />;
      default:
        return <PaymentIcon />;
    }
  };

  // Modern Glass Card Component
  const GlassCard = ({ children, sx = {}, ...props }) => (
    <Card
      sx={{
        background: 'rgba(26, 26, 46, 0.6)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
        },
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );

  // Modern Stat Card Component
  const StatCard = ({ icon, title, value, subtitle, color = '#667eea' }) => (
    <GlassCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
              mr: 2,
              boxShadow: `0 8px 25px ${alpha(color, 0.3)}`,
            }}
          >
            {icon}
          </Avatar>
          <Box flex={1}>
            <Typography
              color="text.secondary"
              variant="body2"
              sx={{ fontWeight: 500, mb: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </GlassCard>
  );

  // Fixed columns configuration
  const columns = [
    {
      field: 'transactionId',
      headerName: 'Transaction ID',
      width: 200,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          <IconButton
            size="small"
            onClick={() => openPaymentDetails(params.row)}
            sx={{
              background: 'rgba(116, 185, 255, 0.1)',
              border: '1px solid rgba(116, 185, 255, 0.2)',
              color: '#74b9ff',
              mr: 1,
              '&:hover': {
                background: 'rgba(116, 185, 255, 0.2)',
              },
            }}
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" fontWeight="medium" sx={{ color: '#667eea' }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          KSh {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'method',
      headerName: 'Method',
      width: 120,
      renderCell: (params) => (
        <Box display="flex" alignItems="center">
          {getPaymentMethodIcon(params.value)}
          <Typography variant="body2" sx={{ ml: 1, textTransform: 'capitalize' }}>
            {params.value || 'Cash'}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const color = getStatusColor(params.value);
        return (
          <Chip
            label={params.value}
            size="small"
            sx={{
              background: `${alpha(color, 0.2)}`,
              color: color,
              border: `1px solid ${alpha(color, 0.3)}`,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          />
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      width: 180,
      renderCell: (params) => (
        <Typography variant="body2">
          {formatDate(params.value)}
        </Typography>
      ),
    },
    // Conditionally add admin columns
    ...(isAdmin ? [
      {
        field: 'customerInfo',
        headerName: 'Customer',
        width: 150,
        renderCell: (params) => (
          <Typography variant="body2">
            {params.value?.name || 'Unknown'}
          </Typography>
        ),
      },
      {
        field: 'subscription',
        headerName: 'Subscription',
        width: 120,
        renderCell: (params) => {
          const hasSubscription = params.row.subscriptionId;
          const color = hasSubscription ? '#00d4aa' : '#9e9e9e';
          const label = hasSubscription ? 'Active' : 'None';

          return (
            <Chip
              icon={<SubscriptionIcon sx={{ fontSize: '16px !important' }} />}
              label={label}
              size="small"
              sx={{
                background: `${alpha(color, 0.2)}`,
                color: color,
                border: `1px solid ${alpha(color, 0.3)}`,
                fontWeight: 500,
                height: 24,
                '& .MuiChip-icon': {
                  color: color,
                  marginLeft: '8px',
                },
              }}
            />
          );
        },
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 150,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params) => {
          const isPending = params.row.status === 'pending';
          
          if (!isPending) {
            return (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No actions
              </Typography>
            );
          }

          return (
            <Box display="flex" gap={1}>
              <Tooltip title="Confirm Payment">
                <IconButton
                  size="small"
                  onClick={() => handleConfirmPayment(params.row.id)}
                  disabled={processing}
                  sx={{
                    background: 'rgba(0, 212, 170, 0.1)',
                    border: '1px solid rgba(0, 212, 170, 0.2)',
                    color: '#00d4aa',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      background: 'rgba(0, 212, 170, 0.2)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  {processing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CheckCircleIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject Payment">
                <IconButton
                  size="small"
                  onClick={() => handleRejectPayment(params.row.id)}
                  disabled={processing}
                  sx={{
                    background: 'rgba(255, 107, 107, 0.1)',
                    border: '1px solid rgba(255, 107, 107, 0.2)',
                    color: '#ff6b6b',
                    width: 32,
                    height: 32,
                    '&:hover': {
                      background: 'rgba(255, 107, 107, 0.2)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                >
                  {processing ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <CancelIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      }
    ] : []),
  ];

  const totalPayments = payments.length;
  const completedPayments = payments.filter(p => p.status === 'completed').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const totalPaid = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => {
      const numericAmount = parseFloat(
        String(p.amount || '0').replace(/[^\d.]/g, '')
      );
      return sum + (isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1,
            }}
          >
            Payments
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your payment transactions and billing
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<CashIcon />}
                onClick={() => setCashDialog(true)}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  background: 'rgba(26, 26, 46, 0.4)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Cash Payment
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setAdminSettingsDialog(true)}
                sx={{
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 500,
                  background: 'rgba(26, 26, 46, 0.4)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Settings
              </Button>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<PhoneIcon />}
            onClick={() => setMpesaDialog(true)}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c8df0 0%, #8b5fb8 100%)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            M-Pesa Payment
          </Button>
        </Box>
      </Box>

      {alert.show && (
        <Alert
          severity={alert.severity}
          sx={{
            mb: 3,
            borderRadius: '12px',
            background: 'rgba(26, 26, 46, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Payment Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaymentIcon />}
            title="Total Payments"
            value={totalPayments}
            color="#667eea"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<CheckCircleIcon />}
            title="Completed"
            value={completedPayments}
            subtitle="payments"
            color="#00d4aa"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ScheduleIcon />}
            title="Pending"
            value={pendingPayments}
            subtitle="payments"
            color="#ffb800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<MoneyIcon />}
            title="Total Amount"
            value={`KSh ${totalPaid.toFixed(2)}`}
            subtitle="completed"
            color="#74b9ff"
          />
        </Grid>
      </Grid>

      {/* Payments Table */}
      <GlassCard>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Payment History
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchPayments}
              size="small"
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              Refresh
            </Button>
          </Box>
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={payments}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              loading={loading}
              getRowId={(row) => row.id}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'text.primary',
                },
                '& .MuiDataGrid-columnHeaders': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  '& .MuiDataGrid-columnHeader': {
                    color: 'text.primary',
                    fontWeight: 600,
                  },
                },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.05)',
                  },
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)',
                },
              }}
            />
          </Box>
        </CardContent>
      </GlassCard>

      {/* M-Pesa Payment Dialog */}
      <Dialog
        open={mpesaDialog}
        onClose={() => setMpesaDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(26, 26, 46, 0.9)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '0 auto 16px',
            }}
          >
            <PhoneIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={600}>
            M-Pesa Payment
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            Enter your M-Pesa details to make a payment
          </Typography>
          
          <TextField
            fullWidth
            label="Phone Number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0712345678"
            sx={{ mb: 3 }}
            helperText="Enter your M-Pesa registered phone number"
          />
          
          <TextField
            fullWidth
            label="Amount (KSh)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
            sx={{ mb: 2 }}
            helperText="Minimum: KSh 1, Maximum: KSh 150,000"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button
            onClick={() => setMpesaDialog(false)}
            disabled={processing}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleMpesaPayment}
            disabled={processing || !phoneNumber || !amount}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c8df0 0%, #8b5fb8 100%)',
              },
            }}
          >
            {processing ? <CircularProgress size={20} color="inherit" /> : 'Pay Now'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cash Payment Dialog (Admin Only) */}
      {isAdmin && (
        <Dialog
          open={cashDialog}
          onClose={() => setCashDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(26, 26, 46, 0.9)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
                margin: '0 auto 16px',
              }}
            >
              <CashIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Typography variant="h5" fontWeight={600}>
              Record Cash Payment
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Record a cash payment for a customer
            </Typography>
            
            <Autocomplete
              options={users}
              getOptionLabel={(option) => `${option.firstName} ${option.lastName} (${option.email})`}
              value={selectedUser}
              onChange={handleUserSelection}
              loading={userSearchLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Customer"
                  placeholder="Search by name or email"
                  sx={{ mb: 3 }}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {userSearchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
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
                  p: 2,
                  mb: 3,
                  borderRadius: '12px',
                  background: 'rgba(0, 212, 170, 0.1)',
                  border: '1px solid rgba(0, 212, 170, 0.2)',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Active Subscription Found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {userSubscription.DataPlan?.name || 'Subscription'} - 
                  KSh {userSubscription.DataPlan?.price || userSubscription.amount || 0}
                </Typography>
              </Box>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount (KSh)"
                  type="number"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="1000"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Reference Number"
                  value={cashReference}
                  onChange={(e) => setCashReference(e.target.value)}
                  placeholder="CASH-001"
                  sx={{ mb: 2 }}
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
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
            <Button
              onClick={() => setCashDialog(false)}
              disabled={processing}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleCashPayment}
              disabled={processing || !selectedUser || !cashAmount || !cashReference}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4ade80 0%, #059669 100%)',
                },
              }}
            >
              {processing ? <CircularProgress size={20} color="inherit" /> : 'Record Payment'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Admin Settings Dialog */}
      {isAdmin && (
        <Dialog
          open={adminSettingsDialog}
          onClose={() => setAdminSettingsDialog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(26, 26, 46, 0.9)',
              backdropFilter: 'blur(30px)',
              WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                margin: '0 auto 16px',
              }}
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
                label="M-Pesa Debug Mode"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
            <Button
              onClick={() => setAdminSettingsDialog(false)}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={saveAdminSettings}
              sx={{
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #a569bd 0%, #9c56c4 100%)',
                },
              }}
            >
              Save Settings
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Payment Details Modal */}
      <Dialog
        open={paymentDetailsModal.open}
        onClose={() => setPaymentDetailsModal({ open: false, payment: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(26, 26, 46, 0.9)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            Payment Details
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {paymentDetailsModal.payment && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Transaction ID
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {paymentDetailsModal.payment.transactionId}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    KSh {formatCurrency(paymentDetailsModal.payment.amount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Method
                  </Typography>
                  <Box display="flex" alignItems="center">
                    {getPaymentMethodIcon(paymentDetailsModal.payment.method)}
                    <Typography variant="body1" sx={{ ml: 1, textTransform: 'capitalize' }}>
                      {paymentDetailsModal.payment.method}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={paymentDetailsModal.payment.status}
                    size="small"
                    sx={{
                      background: `${alpha(getStatusColor(paymentDetailsModal.payment.status), 0.2)}`,
                      color: getStatusColor(paymentDetailsModal.payment.status),
                      border: `1px solid ${alpha(getStatusColor(paymentDetailsModal.payment.status), 0.3)}`,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Date & Time
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(paymentDetailsModal.payment.createdAt)}
                  </Typography>
                </Grid>
                {paymentDetailsModal.payment.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {paymentDetailsModal.payment.description}
                    </Typography>
                  </Grid>
                )}
                {paymentDetailsModal.payment.phoneNumber && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Phone Number
                    </Typography>
                    <Typography variant="body1">
                      {paymentDetailsModal.payment.phoneNumber}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setPaymentDetailsModal({ open: false, payment: null })}
            sx={{
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Payments;