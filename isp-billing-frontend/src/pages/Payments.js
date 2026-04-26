/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Box, Alert, Typography, Button } from '@mui/material';
import {
  Settings as SettingsIcon,
  Phone as PhoneIcon,
  MonetizationOn as CashIcon
} from '@mui/icons-material';
import { useApi } from '../contexts/ApiContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme, alpha } from '@mui/material/styles';

// Import newly created components
import PaymentStatsRow from '../components/payments/PaymentStatsRow';
import PaymentHistoryTable from '../components/payments/PaymentHistoryTable';
import PaymentDetailsDialog from '../components/payments/PaymentDetailsDialog';
import MpesaPaymentDialog from '../components/payments/MpesaPaymentDialog';
import CashPaymentDialog from '../components/payments/CashPaymentDialog';
import AdminPaymentSettingsDialog from '../components/payments/AdminPaymentSettingsDialog';

// Helper to normalized payment method
const getPaymentMethod = (payment) => {
  if (payment.method) return payment.method;
  if (payment.paymentMethod) return payment.paymentMethod;
  if (payment.type) return payment.type;

  const transactionId = payment.transactionId || payment.reference || payment.id || '';
  if (transactionId.toLowerCase().includes('cash')) return 'Cash';
  if (transactionId.toLowerCase().includes('mpesa') || transactionId.toLowerCase().includes('m-pesa')) return 'M-Pesa';
  if (transactionId.toLowerCase().includes('bank')) return 'Bank';
  if (transactionId.toLowerCase().includes('card')) return 'Card';

  if (payment.phoneNumber || payment.phone) return 'M-Pesa';

  return 'Cash';
};

// Helper to normalize customer info
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
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats state
  const [stats, setStats] = useState({
    totalPayments: 0,
    completedPayments: 0,
    pendingPayments: 0,
    totalPaid: 0
  });

  // Dialogs state
  const [mpesaDialog, setMpesaDialog] = useState(false);
  const [cashDialog, setCashDialog] = useState(false);
  const [adminSettingsDialog, setAdminSettingsDialog] = useState(false);

  // Payment processing state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReference, setCashReference] = useState('');
  const [cashDescription, setCashDescription] = useState('');
  const [processing, setProcessing] = useState(false);
  // const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' }); // Replaced by global notification
  const [mpesaDebugMode, setMpesaDebugMode] = useState(false);
  const [cashPaymentEnabled, setCashPaymentEnabled] = useState(false);

  // Details Modal
  const [paymentDetailsModal, setPaymentDetailsModal] = useState({
    open: false,
    payment: null });

  // User selection for cash payments
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  const { paymentsApi, adminApi } = useApi();
  const { user } = useAuth();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const theme = useTheme();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchPayments();
    if (isAdmin) {
      loadAdminSettings();
      fetchUsers();
    }
  }, [isAdmin]);

  // Calculate stats whenever payments change
  useEffect(() => {
    const completed = payments.filter(p => p.status === 'completed');
    const totalPaidAmount = completed.reduce((sum, p) => {
      const val = parseFloat(String(p.amount).replace(/[^\d.-]/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    setStats({
      totalPayments: payments.length,
      completedPayments: completed.length,
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      totalPaid: totalPaidAmount
    });
  }, [payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = isAdmin ? await paymentsApi.getAllPayments() : await paymentsApi.getPaymentHistory();
      const paymentsData = response.data.data || response.data.payments || [];

      const processedPayments = paymentsData.map((payment, index) => ({
        id: payment.id || `payment-${index}`,
        transactionId: payment.transactionId || payment.reference || payment.id || `TXN-${Date.now()}-${index}`,
        amount: payment.amount || 0,
        method: getPaymentMethod(payment),
        status: payment.status || 'pending',
        createdAt: payment.createdAt || new Date().toISOString(),
        customerInfo: getCustomerInfo(payment),
        subscriptionId: payment.subscriptionId || null,
        description: payment.description || 'Payment for ISP services',
        phoneNumber: payment.phoneNumber || payment.phone,
        ...payment
      }));

      setPayments(processedPayments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      notifyError("Error loading payments");
    } finally {
      setLoading(false);
    }
  };

  // const showAlert = ... // Removed

  const handleConfirmPayment = async (paymentId) => {
    try {
      setProcessing(true);
      const payment = payments.find(p => p.id === paymentId);
      await paymentsApi.confirmPayment(paymentId);

      if (payment?.subscriptionId) {
        // Try to activate subscription if confirmed
        try {
          await paymentsApi.activateSubscription(payment.subscriptionId);
          notifySuccess("Payment confirmed and subscription activated!");
        } catch (subError) {
          console.warn("Auto-activation failed or not applicable", subError);
          notifySuccess("Payment confirmed successfully!");
        }
      } else {
        notifySuccess("Payment confirmed successfully!");
      }

      fetchPayments();
      if (selectedUser) fetchUserSubscription(selectedUser.id);
    } catch (error) {
      console.error("Error confirming payment:", error);
      notifyError(error.response?.data?.message || "Failed to confirm payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectPayment = async (paymentId) => {
    try {
      setProcessing(true);
      await paymentsApi.rejectPayment(paymentId);
      notifySuccess("Payment rejected successfully");
      fetchPayments();
    } catch (error) {
      console.error("Error rejecting payment:", error);
      notifyError(error.response?.data?.message || "Failed to reject payment");
    } finally {
      setProcessing(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUserSearchLoading(true);
      const response = await adminApi.users.getAll();
      setUsers(response.data?.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
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
        subscription = response.data.data.subscriptions.find(sub => sub.status === 'active' && new Date(sub.endDate) > new Date());
      }

      if (subscription) {
        setUserSubscription(subscription);
        const amt = subscription.DataPlan?.price || subscription.amount || 0;
        setCashAmount(amt.toString());
        setCashDescription(`Payment for ${subscription.DataPlan?.name || 'ISP services'} - ${selectedUser?.firstName}`);
      } else {
        setUserSubscription(null);
        setCashAmount('');
        setCashDescription(`Cash payment for ISP services - ${selectedUser?.firstName}`);
      }
    } catch (error) {
      console.error('Error fetching sub:', error);
      setUserSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadAdminSettings = async () => {
    try {
      const settings = await adminApi.settings?.getPaymentSettings() || {};
      setCashPaymentEnabled(settings.cashPaymentEnabled || false);
      setMpesaDebugMode(settings.mpesaDebugMode || false);
    } catch (e) { console.error(e); }
  };

  const saveAdminSettings = async () => {
    try {
      await adminApi.settings?.updatePaymentSettings({ cashPaymentEnabled, mpesaDebugMode });
      notifySuccess('Settings updated');
      setAdminSettingsDialog(false);
    } catch (e) { notifyError('Failed to update settings'); }
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber || !amount) return notifyWarning('Fill all fields');
    try {
      setProcessing(true);
      const formattedPhone = phoneNumber.replace(/^0/, '254');
      await paymentsApi.initiateMpesa({
        phoneNumber: formattedPhone,
        amount: parseFloat(amount),
        description: 'ISP Billing',
        accountReference: `ISP-${Date.now()}`
      });
      notifySuccess('M-Pesa prompt sent!');
      setMpesaDialog(false);
      setPhoneNumber(''); setAmount('');
      setTimeout(fetchPayments, 3000);
    } catch (error) {
      notifyError(error.response?.data?.message || 'M-Pesa initiation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    if (!selectedUser || !cashAmount || !cashReference) return notifyWarning('Missing fields');
    try {
      setProcessing(true);
      const response = await paymentsApi.createCashPayment({
        userId: selectedUser.id,
        amount: parseFloat(cashAmount),
        reference: cashReference,
        description: cashDescription,
        subscriptionId: userSubscription?.id || null,
        activateSubscription: true
      });
      if (response.data?.success) {
        notifySuccess('Cash payment recorded');
        setCashDialog(false);
        setSelectedUser(null); setCashAmount(''); setCashReference('');
        fetchPayments();
      }
    } catch (error) {
      notifyError(error.response?.data?.message || 'Cash payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 700, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 1 }}>
            Payments
          </Typography>
          <Typography variant="body1" color="text.secondary">Manage your payment transactions</Typography>
        </Box>
        <Box display="flex" gap={2}>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<CashIcon />}
                onClick={() => setCashDialog(true)}
                sx={{
                  
                  textTransform: 'none',
                  color: 'text.primary',
                  borderColor: 'divider',
                  '&:hover': { background: alpha(theme.palette.text.primary, 0.1) }
                }}
              >
                Cash Payment
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setAdminSettingsDialog(true)}
                sx={{
                  
                  textTransform: 'none',
                  color: 'text.primary',
                  borderColor: 'divider',
                  '&:hover': { background: alpha(theme.palette.text.primary, 0.1) }
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
              
              textTransform: 'none',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
            }}
          >
            M-Pesa Payment
          </Button>
        </Box>
      </Box>

      {/* Alert removed */}

      <PaymentStatsRow stats={stats} />

      <PaymentHistoryTable
        payments={payments}
        loading={loading}
        isAdmin={isAdmin}
        onViewDetails={(p) => setPaymentDetailsModal({ open: true, payment: p })}
        onConfirm={handleConfirmPayment}
        onReject={handleRejectPayment}
        processing={processing}
        onRefresh={fetchPayments}
      />

      <PaymentDetailsDialog
        open={paymentDetailsModal.open}
        payment={paymentDetailsModal.payment}
        onClose={() => setPaymentDetailsModal({ open: false, payment: null })}
      />

      <MpesaPaymentDialog
        open={mpesaDialog}
        onClose={() => setMpesaDialog(false)}
        onPay={handleMpesaPayment}
        processing={processing}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        amount={amount}
        setAmount={setAmount}
      />

      {isAdmin && (
        <>
          <CashPaymentDialog
            open={cashDialog}
            onClose={() => setCashDialog(false)}
            onPay={handleCashPayment}
            processing={processing}
            users={users}
            selectedUser={selectedUser}
            setSelectedUser={(e, v) => {
              setSelectedUser(v);
              if (v) fetchUserSubscription(v.id);
            }}
            userSearchLoading={userSearchLoading}
            loadingSubscription={loadingSubscription}
            userSubscription={userSubscription}
            cashAmount={cashAmount}
            setCashAmount={setCashAmount}
            cashReference={cashReference}
            setCashReference={setCashReference}
            cashDescription={cashDescription}
            setCashDescription={setCashDescription}
          />
          <AdminPaymentSettingsDialog
            open={adminSettingsDialog}
            onClose={() => setAdminSettingsDialog(false)}
            cashPaymentEnabled={cashPaymentEnabled}
            setCashPaymentEnabled={setCashPaymentEnabled}
            mpesaDebugMode={mpesaDebugMode}
            setMpesaDebugMode={setMpesaDebugMode}
            onSave={saveAdminSettings}
          />
        </>
      )}
    </Box>
  );
};

export default Payments;