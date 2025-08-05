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
} from "@mui/material";
import {
  DataUsage as DataUsageIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import { useApi } from "../contexts/ApiContext";
import { useAuth } from "../contexts/AuthContext";
import { formatBytes } from "../utils/helpers";

const ErrorBoundary = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  const handleOnError = (error, errorInfo) => {
    console.error("DataGrid Error:", error, errorInfo);
    setHasError(true);
  };

  if (hasError) {
    return fallback || <Typography color="error">Error displaying data</Typography>;
  }

  return children;
};

const statusColor = (s) =>
  ({ 
    active: "success", 
    expired: "error", 
    suspended: "warning", 
    cancelled: "default", 
    pending: "info" 
  }[s] ?? "default");

const paymentStatusColor = (s) =>
  ({
    paid: "success",
    unpaid: "error",
    pending: "warning",
    refunded: "info"
  }[s] ?? "default");

const safeValueGetter = (params, field, defaultValue = "—") => {
  try {
    if (!params || !params.row) return defaultValue;
    return params.row[field] ?? defaultValue;
  } catch (error) {
    console.error("Error in safeValueGetter:", error);
    return defaultValue;
  }
};

// Safe getter for nested properties
const safeNestedValueGetter = (params, path, defaultValue = "—") => {
  try {
    if (!params || !params.row) return defaultValue;
    const keys = path.split('.');
    let value = params.row;
    for (const key of keys) {
      if (value == null) return defaultValue;
      value = value[key];
    }
    return value ?? defaultValue;
  } catch (error) {
    console.error("Error in safeNestedValueGetter:", error);
    return defaultValue;
  }
};

export default function Subscriptions() {
  const { subscriptionsApi } = useApi();
  const { user } = useAuth();

  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [dlgOpen, setDlgOpen] = useState(false);
  const [selSub, setSelSub] = useState(null);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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

  const cols = React.useMemo(() => [
    { 
      field: "subscriptionNumber", 
      headerName: "Subscription #", 
      width: 160,
      valueGetter: (params) => safeValueGetter(params, "subscriptionNumber"),
      renderCell: (params) => {
        const value = safeValueGetter(params, "subscriptionNumber");
        const isCurrent = safeValueGetter(params, "isCurrent", false);
        return (
          <Box>
            <Typography fontWeight="medium">{value}</Typography>
            {isCurrent && (
              <Chip 
                label="Current" 
                color="primary" 
                size="small" 
                sx={{ mt: 0.5 }} 
              />
            )}
          </Box>
        );
      }
    },
    { 
      field: "planName", 
      headerName: "Plan", 
      width: 180,
      valueGetter: (params) => safeNestedValueGetter(params, "DataPlan.name", "—"),
      renderCell: (params) => {
        const value = safeNestedValueGetter(params, "DataPlan.name", "—");
        const isCurrent = safeValueGetter(params, "isCurrent", false);
        return (
          <Typography fontWeight={isCurrent ? "bold" : "normal"}>
            {value}
          </Typography>
        );
      }
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 120,
      valueGetter: (params) => safeValueGetter(params, "status", "unknown"),
      renderCell: (params) => {
        const value = safeValueGetter(params, "status", "unknown");
        return (
          <Chip 
            label={value} 
            color={statusColor(value)} 
            size="small" 
          />
        );
      }
    },
    { 
      field: "paymentStatus", 
      headerName: "Payment", 
      width: 120,
      valueGetter: (params) => safeValueGetter(params, "paymentStatus", "N/A"),
      renderCell: (params) => {
        const value = safeValueGetter(params, "paymentStatus", "N/A");
        return (
          <Chip 
            label={value} 
            color={paymentStatusColor(value)} 
            size="small" 
            icon={<PaymentIcon fontSize="small" />}
          />
        );
      }
    },
    { 
      field: "dataRemaining", 
      headerName: "Data Left", 
      width: 140,
      valueGetter: (params) => safeValueGetter(params, "dataRemaining", 0),
      renderCell: (params) => {
        const value = safeValueGetter(params, "dataRemaining", 0);
        return <Typography>{formatBytes(value)}</Typography>;
      }
    },
    { 
      field: "endDate", 
      headerName: "Expires", 
      width: 140,
      valueGetter: (params) => safeValueGetter(params, "endDate"),
      renderCell: (params) => {
        const value = safeValueGetter(params, "endDate");
        return (
          <Typography>
            {value ? new Date(value).toLocaleDateString() : "—"}
          </Typography>
        );
      }
    },
    { 
      field: "actions", 
      headerName: "", 
      width: 110, 
      sortable: false,
      renderCell: (params) => {
        const status = safeValueGetter(params, "status");
        const row = params?.row;
        return (
          <Box>
            {status === "active" && row && (
              <Tooltip title="Cancel">
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => askCancel(row)}
                >
                  <CancelIcon fontSize="small"/>
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Details">
              <IconButton size="small" color="primary">
                <InfoIcon fontSize="small"/>
              </IconButton>
            </Tooltip>
          </Box>
        );
      }
    }
  ], []);

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>My Subscriptions</Typography>
        <LinearProgress/>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4">My Subscriptions</Typography>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon/>} 
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
                  sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
                />
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ScheduleIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      {Math.floor(daysLeft(currentSub))} days left
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SpeedIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      High speed
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <DataUsageIcon sx={{ mr: 1 }} fontSize="small" />
                    <Typography variant="body2">
                      {formatBytes(currentSub.DataPlan?.dataLimit || 0)} total
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
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
              <Grid item xs={12} md={6} lg={4} key={s.id}>
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
                        sx={{ height: 8, borderRadius: 4, mt: 0.5 }}
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
          <Box sx={{ height: 400, width: "100%" }}>
            {tableRows.length > 0 ? (
              <ErrorBoundary fallback={<Typography color="error">Error displaying subscription data</Typography>}>
                <DataGrid
                  rows={tableRows}
                  columns={cols}
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  disableSelectionOnClick
                  sx={{
                    "& .MuiDataGrid-cell": { borderBottom: "1px solid #f0f0f0" },
                    "& .MuiDataGrid-columnHeaders": {
                      background: "#fafafa",
                      borderBottom: "2px solid #e0e0e0"
                    }
                  }}
                />
              </ErrorBoundary>
            ) : (
              <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                <Typography>No subscription data available</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {subs.length === 0 && (
        <Box textAlign="center" py={8}>
          <DataUsageIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No subscriptions found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            You haven't subscribed to any data plans yet.
          </Typography>
          <Button variant="contained" href="/data-plans">
            Browse Plans
          </Button>
        </Box>
      )}

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
    </Box>
  );
}

