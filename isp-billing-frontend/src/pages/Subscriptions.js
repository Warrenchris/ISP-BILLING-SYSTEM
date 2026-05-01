/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  useTheme } from "@mui/material";
import {
  DataUsage as DataUsageIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Payment as PaymentIcon,
  CreditCard as PayIcon } from "@mui/icons-material";
import { CheckCircle as CheckIcon } from "@mui/icons-material";
import { useApi } from "../contexts/ApiContext";
import { useAuth } from "../contexts/AuthContext";
import { formatBytes } from "../utils/helpers";

const statusColor = (s) =>
({
  active: "success",
  expired: "error",
  suspended: "warning",
  cancelled: "secondary",
  pending: "warning",
  paid: "success",
  completed: "success",
  failed: "error",
  unpaid: "error"
}[s] ?? "default");

export default function Subscriptions() {
  const { subscriptionsApi, paymentsApi } = useApi();
  const { user } = useAuth();
  const theme = useTheme();

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selSub, setSelSub] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Payment State
  const [payDlgOpen, setPayDlgOpen] = useState(false);
  const [payPhoneNumber, setPayPhoneNumber] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentPolling, setPaymentPolling] = useState(false);
  const [payStatus, setPayStatus] = useState(null); // 'pending', 'completed', 'failed'

  const pop = (msg, sev = "info") => {
    setAlert({ msg, sev });
    setTimeout(() => setAlert(null), 4000);
  };

  const load = async () => {
    try {
      setLoading(true);
      const r = await subscriptionsApi.getCurrent();
      const currentSub = r.data?.data?.subscription || null;
      const allSubs = await subscriptionsApi.getAll();
      const subscriptions = allSubs.data?.data?.subscriptions || [];

      const markedSubs = subscriptions.map(sub => ({
        ...sub,
        isCurrent: currentSub && sub.id === currentSub.id
      }));

      setSubs(markedSubs);
    } catch (e) {
      console.error("fetch subs", e);
      pop("Failed to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const activeSubs = subs.filter((s) => s?.status === "active");
  const currentSub = subs.find((s) => s?.isCurrent) || null;

  const tableRows = React.useMemo(() => {
    const defaultDataPlan = { name: "Unknown Plan", dataLimit: 0 };
    return subs.map((s) => ({
      id: s?.id || Math.random().toString(36).substring(2, 9),
      subscriptionNumber: s?.subscriptionNumber || "N/A",
      status: s?.status || "unknown",
      paymentStatus: s?.paymentStatus || "N/A",
      dataRemaining: s?.dataRemaining ?? 0,
      endDate: s?.endDate || null,
      DataPlan: s?.DataPlan || defaultDataPlan,
      isCurrent: Boolean(s?.isCurrent),
      ...(s || {})
    }));
  }, [subs]);

  const askCancel = (s) => {
    if (!s) return;
    setSelSub(s);
    setReason("");
    setDlgOpen(true);
  };

  const confirmCancel = async () => {
    if (!selSub || !reason.trim()) {
      pop("Provide a reason", "warning");
      return;
    }
    try {
      setCancelling(true);
      await subscriptionsApi.cancel(selSub.id, reason);
      pop("Subscription cancelled", "success");
      setDlgOpen(false);
      load();
    } catch (e) {
      console.error("cancel", e);
      pop(e.response?.data?.message || "Cancel failed", "error");
    } finally {
      setCancelling(false);
    }
  };

  // --- Payment Logic ---
  const handlePayClick = (sub) => {
    if (!sub) return;
    setSelSub(sub);
    setPayPhoneNumber(user?.phoneNumber || "");
    setPayDlgOpen(true);
    setPayStatus(null);
  };

  const pollPayment = async (paymentId) => {
    setPaymentPolling(true);
    setPayStatus('pending');

    let attempts = 0;
    const max = 20; // 60s

    const check = async () => {
      if (attempts >= max) {
        setPaymentPolling(false);
        setPayStatus('timeout');
        pop("Payment check timed out. Please check status later.", "warning");
        return;
      }
      try {
        const res = await paymentsApi.checkStatus(paymentId);
        const st = res.data?.payment?.status;
        if (st === 'completed') {
          setPaymentPolling(false);
          setPayStatus('completed');
          pop("Payment successful!", "success");
          load(); // Refresh list to show active
          setTimeout(() => {
            setPayDlgOpen(false);
            setPayStatus(null);
          }, 2000);
        } else if (st === 'failed' || st === 'cancelled') {
          setPaymentPolling(false);
          setPayStatus('failed');
          pop("Payment failed", "error");
        } else {
          attempts++;
          setTimeout(check, 3000);
        }
      } catch (e) {
        attempts++;
        setTimeout(check, 3000);
      }
    };
    check();
  };

  const confirmPay = async () => {
    if (!selSub || !payPhoneNumber) return;
    try {
      setPaying(true);
      // Initiate
      const res = await paymentsApi.initiateSubscriptionPayment({
        subscriptionId: selSub.id,
        phoneNumber: payPhoneNumber
      });
      const pid = res.data?.payment?.id;

      pop("Payment initiated. Check phone.", "success");

      if (pid) {
        setPaying(false); // Enable close but keep dialog for polling
        pollPayment(pid);
      } else {
        setPaying(false);
        setPayDlgOpen(false);
      }

    } catch (e) {
      console.error(e);
      setPaying(false);
      pop(e.response?.data?.message || "Payment init failed", "error");
    }
  };

  const usagePct = (s) => {
    if (!s) return 0;
    const limit = s.DataPlan?.dataLimit ?? 0;
    if (!limit) return 0;
    const used = limit - (s.dataRemaining ?? 0);
    return Math.min((used / limit) * 100, 100);
  };

  const daysLeft = (s) => {
    if (!s?.endDate) return 0;
    return Math.max(
      Math.ceil((new Date(s.endDate) - Date.now()) / (1000 * 60 * 60 * 24)),
      0
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, width: "100%", overflowX: "hidden" }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          My Subscriptions
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: "100%", overflowX: "hidden", bgcolor: "background.default" }}>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          My Subscriptions
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={load}
        >
          Refresh
        </Button>
      </Box>

      {alert && <Alert severity={alert.sev} sx={{ mb: 2 }}>{alert.msg}</Alert>}

      {/* CURRENT SUBSCRIPTION CARD */}
      {currentSub && (
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>
            Current Subscription
          </Typography>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="h6" fontWeight="bold">
                  {currentSub.DataPlan?.name || "Unknown Plan"}
                </Typography>
                <Chip
                  label={currentSub.status || "unknown"}
                  color={statusColor(currentSub.status)}
                  size="small"
                />
              </Box>

              <Typography variant="caption" color="text.secondary">
                #{currentSub.subscriptionNumber || "N/A"}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box mb={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Data usage</Typography>
                  <Typography variant="body2">
                    {formatBytes(currentSub.dataRemaining || 0)} remaining
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={usagePct(currentSub)}
                  sx={{ height: 8,  mt: 0.5 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ScheduleIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      {Math.floor(daysLeft(currentSub))} days left
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SpeedIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      High speed
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <DataUsageIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      {formatBytes(currentSub.DataPlan?.dataLimit || 0)} total
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PaymentIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      {currentSub.paymentStatus || 'N/A'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {currentSub.status === "active" && (
                <Button
                  fullWidth
                  color="error"
                  variant="outlined"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={() => askCancel(currentSub)}
                  sx={{ mt: 2 }}
                >
                  Cancel Subscription
                </Button>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ACTIVE SUBSCRIPTIONS */}
      {activeSubs.length > 0 && activeSubs.some(s => !s?.isCurrent) && (
        <Box mb={4}>
          <Typography variant="h5" gutterBottom>
            Other Active Subscriptions
          </Typography>
          <Grid container spacing={3}>
            {activeSubs.filter(s => !s?.isCurrent).map((s) => (
              <Grid size={{ xs: 12, md: 6 }} lg={4} key={s.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="h6">{s.DataPlan?.name || "Unknown Plan"}</Typography>
                      <Chip
                        label={s.status || "unknown"}
                        color={statusColor(s.status)}
                        size="small"
                      />
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      #{s.subscriptionNumber || "N/A"}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Box mb={2}>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body2">Data usage</Typography>
                        <Typography variant="body2">
                          {formatBytes(s.dataRemaining || 0)} left
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={usagePct(s)}
                        sx={{ height: 8,  mt: 0.5 }}
                      />
                    </Box>

                    <Box display="flex" alignItems="center" mb={1}>
                      <ScheduleIcon sx={{ mr: 1 }} fontSize="small" />
                      <Typography variant="body2">
                        {Math.floor(daysLeft(s))} days left
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" mb={2}>
                      <DataUsageIcon sx={{ mr: 1 }} fontSize="small" />
                      <Typography variant="body2">
                        Total {formatBytes(s.DataPlan?.dataLimit || 0)}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      color="error"
                      variant="outlined"
                      size="small"
                      startIcon={<CancelIcon />}
                      onClick={() => askCancel(s)}
                    >
                      Cancel
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ALL SUBSCRIPTIONS TABLE */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Subscription History
          </Typography>
          <Box sx={{ width: "100%", overflowX: "auto" }}>
            {tableRows.length > 0 ? (
              <Box
                component="table"
                sx={{
                  width: "100%",
                  minWidth: 900,
                  tableLayout: "fixed",
                  borderCollapse: "collapse"
                }}
              >
                <Box component="thead">
                  <Box component="tr" sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                    <Box component="th" sx={{ width: "20%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Subscription #</Box>
                    <Box component="th" sx={{ width: "20%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Plan</Box>
                    <Box component="th" sx={{ width: "12%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Status</Box>
                    <Box component="th" sx={{ width: "15%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Payment</Box>
                    <Box component="th" sx={{ width: "13%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Data Left</Box>
                    <Box component="th" sx={{ width: "13%", textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Expires</Box>
                    <Box component="th" sx={{ width: "7%", minWidth: 80, textAlign: "left", py: 1.5, pr: 1, color: "text.secondary" }}>Actions</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {tableRows.map((row) => (
                    <Box component="tr" key={row.id} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Typography component="span" fontWeight="medium">
                          {row.subscriptionNumber || "N/A"}
                        </Typography>
                        {row.isCurrent && (
                          <Chip label="Current" color="primary" size="small" sx={{ ml: 1 }} />
                        )}
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Typography component="span">{row?.DataPlan?.name || "—"}</Typography>
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          label={row.status || "unknown"}
                          color={statusColor((row.status || "").toLowerCase())}
                        />
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          icon={<PaymentIcon fontSize="small" />}
                          label={row.paymentStatus || "pending"}
                          color={statusColor((row.paymentStatus || "").toLowerCase())}
                        />
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {formatBytes(row.dataRemaining || 0)}
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.endDate ? new Date(row.endDate).toLocaleDateString() : "—"}
                      </Box>
                      <Box component="td" sx={{ py: 1.5, pr: 1, minWidth: 80 }}>
                        <Box sx={{ display: "flex", alignItems: "center", minWidth: 80 }}>
                          {row.status === "active" && (
                            <Tooltip title="Cancel">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => askCancel(row)}
                                sx={{ flexShrink: 0 }}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {row.status !== "active" && row.paymentStatus === "pending" && (
                            <Tooltip title="Pay Now">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handlePayClick(row)}
                                sx={{ flexShrink: 0 }}
                              >
                                <PayIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Details">
                            <IconButton size="small" color="primary" sx={{ flexShrink: 0 }}>
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" py={8}>
                <Typography color="text.secondary">No subscriptions yet</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* CANCEL DIALOG */}
      <Dialog
        open={dlgOpen}
        onClose={() => setDlgOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          {selSub && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                You're cancelling <b>{selSub.DataPlan?.name || "Unknown Plan"}</b>. This can't be undone.
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                required
                label="Reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you cancelling?"
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlgOpen(false)} disabled={cancelling}>
            Keep It
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmCancel}
            disabled={cancelling || !reason.trim()}
          >
            {cancelling ? <CircularProgress size={20} /> : "Confirm Cancel"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PAY DIALOG */}
      <Dialog open={payDlgOpen} onClose={() => !paying && !paymentPolling && setPayDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Payment</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {paymentPolling ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={50} sx={{ mb: 2 }} />
              <Typography variant="h6">Waiting for M-Pesa...</Typography>
              <Typography variant="body2" color="text.secondary">Check your phone.</Typography>
            </Box>
          ) : payStatus === 'completed' ? (
            <Box textAlign="center" py={4}>
              <CheckIcon color="success" sx={{ fontSize: 60 }} />
              <Typography variant="h5" color="success.main">Paid Successfully!</Typography>
            </Box>
          ) : (
            <>
              <Typography gutterBottom>
                Pay for subscription <b>{selSub?.DataPlan?.name}</b> verification.
              </Typography>
              <TextField
                fullWidth
                label="M-Pesa Number"
                value={payPhoneNumber}
                onChange={(e) => setPayPhoneNumber(e.target.value)}
                placeholder="07..."
                sx={{ mt: 2 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!paymentPolling && payStatus !== 'completed' && (
            <>
              <Button onClick={() => setPayDlgOpen(false)} disabled={paying}>Cancel</Button>
              <Button variant="contained" color="success" onClick={confirmPay} disabled={paying}>
                {paying ? <CircularProgress size={20} /> : "Pay Now"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box >
  );
}

