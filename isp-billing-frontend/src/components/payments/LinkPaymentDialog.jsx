import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Divider
} from '@mui/material';
import { useApi } from '../../contexts/ApiContext';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/helpers';

export default function LinkPaymentDialog({
  open,
  payment,
  onClose,
  onSuccess
}) {
  const { paymentsApi, subscriptionsApi } = useApi();
  const { notifyError, notifySuccess } = useNotification();

  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subs, setSubs] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [linking, setLinking] = useState(false);
  const [alsoConfirm, setAlsoConfirm] = useState(false);

  const customerId = payment?.userId || payment?.User?.id || payment?.customerId || null;

  const visibleSubs = useMemo(() => {
    // backend does not support status list; filter client-side
    return (subs || []).filter((s) => ['pending', 'active'].includes(String(s.status || '').toLowerCase()));
  }, [subs]);

  useEffect(() => {
    if (!open) return;
    setSelectedSubId('');
    setAlsoConfirm(false);
    setSubs([]);

    const load = async () => {
      if (!customerId) return;
      try {
        setLoadingSubs(true);
        const res = await subscriptionsApi.getAllAdmin({ userId: customerId, limit: 200 });
        const list = res?.data?.data?.subscriptions || [];
        setSubs(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        notifyError('Failed to load customer subscriptions');
      } finally {
        setLoadingSubs(false);
      }
    };
    load();
  }, [open, customerId, notifyError, subscriptionsApi]);

  const submit = async () => {
    if (!payment?.id) return;
    if (!selectedSubId) return notifyError('Select a subscription');

    try {
      setLinking(true);
      await paymentsApi.patchPayment(payment.id, { subscriptionId: selectedSubId });

      // Optional confirm if pending
      if (alsoConfirm && String(payment.status).toLowerCase() === 'pending') {
        await paymentsApi.confirmPayment(payment.id);
      }

      notifySuccess('Payment linked. Subscription activated if completed.');
      if (typeof onSuccess === 'function') onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
      notifyError(e.response?.data?.message || 'Failed to link payment');
    } finally {
      setLinking(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !linking && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Link payment to subscription</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Amount
          </Typography>
          <Typography variant="h6">
            {formatCurrency(payment?.amount || 0)}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Date
          </Typography>
          <Typography variant="body1">
            {payment?.createdAt ? formatDate(payment.createdAt) : '—'}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Customer
          </Typography>
          <Typography variant="body1">
            {payment?.customerInfo?.name || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {payment?.customerInfo?.email || ''}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <TextField
          select
          fullWidth
          label="Subscription"
          value={selectedSubId}
          onChange={(e) => setSelectedSubId(e.target.value)}
          disabled={loadingSubs || linking}
          helperText="Only pending/active subscriptions are shown"
        >
          {visibleSubs.map((s) => {
            const plan = s.DataPlan || s.plan;
            const label = `${plan?.name || 'Plan'} • ${s.status} • ${formatDate(s.startDate)} → ${formatDate(s.endDate)}`;
            return (
              <MenuItem key={s.id} value={s.id}>
                {label}
              </MenuItem>
            );
          })}
          {!loadingSubs && visibleSubs.length === 0 && (
            <MenuItem value="" disabled>
              No pending/active subscriptions found
            </MenuItem>
          )}
        </TextField>

        {String(payment?.status || '').toLowerCase() === 'pending' && (
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={alsoConfirm} onChange={(e) => setAlsoConfirm(e.target.checked)} />}
            label="Also confirm this payment after linking"
          />
        )}

        {loadingSubs && (
          <Box display="flex" alignItems="center" gap={1} mt={2}>
            <CircularProgress size={18} />
            <Typography variant="caption" color="text.secondary">
              Loading subscriptions…
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={linking}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={linking || !selectedSubId}>
          {linking ? <CircularProgress size={18} color="inherit" /> : 'Link payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

