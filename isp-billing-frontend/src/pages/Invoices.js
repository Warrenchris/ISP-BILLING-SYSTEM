import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  alpha,
  Avatar } from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { useApi } from '../contexts/ApiContext';
import { formatCurrency } from '../utils/helpers';

const Invoices = () => {
  const theme = useTheme();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [downloading, setDownloading] = useState({});
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'info' });
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const { invoicesApi, authApi } = useApi();

  // Admin-only filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const showAlert = (message, severity = 'info') => {
    setAlert({ show: true, message, severity });
    setTimeout(() => setAlert({ show: false, message: '', severity: 'info' }), 5000);
  };
  const fetchInvoices = useCallback(async (isAdminUser = false) => {
    try {
      setLoading(true);
      const params = isAdminUser ? {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchFilter?.trim() ? searchFilter.trim() : undefined,
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
      } : undefined;

      const response = isAdminUser
        ? await invoicesApi.getAll(params)
        : await invoicesApi.getMy();

      const invoicesList = response?.data?.data?.invoices;
      setInvoices(Array.isArray(invoicesList) ? invoicesList : []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showAlert('Error loading invoices', 'error');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [invoicesApi, statusFilter, searchFilter, fromDate, toDate]);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const res = await authApi.getProfile();
        const admin = res?.data?.data?.role?.toLowerCase?.() === 'admin';
        setIsAdminUser(admin);
        await fetchInvoices(admin);
      } catch (error) {
        console.error('Profile error:', error);
        setIsAdminUser(false);
        await fetchInvoices(false);
      }
    };
    checkRole();
  }, [authApi, fetchInvoices]);

  // Re-fetch on filter change (admin only)
  useEffect(() => {
    if (!isAdminUser) return;
    fetchInvoices(true);
  }, [isAdminUser, statusFilter, searchFilter, fromDate, toDate, fetchInvoices]);

  const handleMarkInvoicePaid = async () => {
    if (!selectedInvoice) return;
    try {
      setMarkingPaid(true);
      await invoicesApi.markAsPaid(selectedInvoice.id, {
        paidAmount: Number(selectedInvoice.totalAmount),
        paymentMethod: 'cash',
        notes: 'Marked paid by admin'
      });
      showAlert('Invoice marked as paid', 'success');
      setInvoiceDialog(false);
      await fetchInvoices(isAdminUser);
    } catch (error) {
      console.error(error);
      showAlert(error.response?.data?.message || 'Failed to mark invoice paid', 'error');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      setDownloading({ ...downloading, [invoice.id]: true });

      const response = await invoicesApi.downloadPdf(invoice.id);

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showAlert('Invoice downloaded successfully', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showAlert('Failed to download invoice', 'error');
    } finally {
      setDownloading({ ...downloading, [invoice.id]: false });
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      paid: theme.palette.success.main,
      pending: theme.palette.warning.main,
      overdue: theme.palette.error.main,
      cancelled: theme.palette.text.disabled };
    return colors[status] || theme.palette.text.disabled;
  };

  //   const getStatusIcon = (status) => {
  //     switch (status) {
  //       case 'paid':
  //         return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
  //       case 'pending':
  //         return <ScheduleIcon sx={{ color: theme.palette.warning.main }} />;
  //       case 'overdue':
  //         return <CancelIcon sx={{ color: theme.palette.error.main }} />;
  //       default:
  //         return <ReceiptIcon />;
  //     }
  //   };

  const isOverdue = (dueDate, status) => {
    if (status === 'paid') return false;
    return new Date(dueDate) < new Date();
  };

  // Modern Glass Card Component
  const GlassCard = ({ children, sx = {}, ...props }) => (
    <Card
      sx={{
        background: 'rgba(15, 15, 15, 0.85)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        
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
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)' },
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
          borderColor: 'rgba(255, 255, 255, 0.15)' },
        ...sx }}
      {...props}
    >
      {children}
    </Card>
  );

  // Modern Stat Card Component
  const StatCard = ({ icon, title, value, subtitle, color = theme.palette.primary.main }) => (
    <GlassCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center">
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
              mr: 2,
              boxShadow: `0 8px 25px ${alpha(color, 0.3)}` }}
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
                backgroundClip: 'text' }}
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

  const columns = [
    {
      field: 'invoiceNumber',
      headerName: 'Invoice #',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium" sx={{ color: theme.palette.primary.main }}>
          {params.value}
        </Typography>
      ) },
    {
      field: 'totalAmount',
      headerName: 'Amount',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(params.value)}
        </Typography>
      ) },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = isOverdue(params.row.dueDate, params.value) ? 'overdue' : params.value;
        const color = getStatusColor(status);
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              background: `${alpha(color, 0.2)}`,
              color: color,
              border: `1px solid ${alpha(color, 0.3)}`,
              fontWeight: 500,
              textTransform: 'capitalize' }}
          />
        );
      } },
    {
      field: 'issueDate',
      headerName: 'Issue Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ) },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      renderCell: (params) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      ) },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="View Invoice">
            <IconButton
              size="small"
              onClick={() => handleViewInvoice(params.row)}
              sx={{
                background: alpha(theme.palette.info.main, 0.1),
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                color: theme.palette.info.main,
                '&:hover': {
                  background: 'rgba(116, 185, 255, 0.2)',
                  transform: 'translateY(-1px)' } }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download PDF">
            <IconButton
              size="small"
              onClick={() => handleDownloadPdf(params.row)}
              disabled={downloading[params.row.id]}
              sx={{
                background: alpha(theme.palette.primary.main, 0.1),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                color: theme.palette.primary.main,
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.2)',
                  transform: 'translateY(-1px)' },
                '&:disabled': {
                  opacity: 0.5 } }}
            >
              {downloading[params.row.id] ? (
                <CircularProgress size={16} />
              ) : (
                <DownloadIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ) },
  ];

  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  const overdueInvoices = invoices.filter(inv =>
    inv.status === 'pending' && isOverdue(inv.dueDate, inv.status)
  );
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 1 }}
          >
            Invoices
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and track your billing invoices
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchInvoices(isAdminUser)}
          sx={{
            
            textTransform: 'none',
            fontWeight: 500,
            background: 'rgba(15, 15, 15, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              transform: 'translateY(-1px)' } }}
        >
          Refresh
        </Button>
      </Box>

      {alert.show && (
        <Alert
          severity={alert.severity}
          sx={{
            mb: 3,
            
            background: 'rgba(26, 26, 46, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          {alert.message}
        </Alert>
      )}

      {/* Admin filters */}
      {isAdminUser && (
        <Card sx={{ mb: 3, background: 'rgba(15, 15, 15, 0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  fullWidth
                  label="Customer search (email or name)"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="e.g. alice@example.com"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="From"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="To"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setStatusFilter('all');
                      setSearchFilter('');
                      setFromDate('');
                      setToDate('');
                    }}
                  >
                    Clear filters
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary */}
      <Grid container spacing={3} mb={4}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ReceiptIcon />}
            title="Total Invoices"
            value={invoices.length}
            color="#667eea"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<ScheduleIcon />}
            title="Pending Amount"
            value={formatCurrency(totalPending)}
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<CancelIcon />}
            title="Overdue"
            value={overdueInvoices.length}
            subtitle="invoices"
            color="#EF4444"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircleIcon />}
            title="Paid"
            value={invoices.filter(inv => inv.status === 'paid').length}
            subtitle="invoices"
            color="#22C55E"
          />
        </Grid>
      </Grid>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.2)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)' }}
        >
          You have {overdueInvoices.length} overdue invoice(s). Please make payment to avoid service interruption.
        </Alert>
      )}

      {/* Invoices Table */}
      <GlassCard>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            All Invoices
          </Typography>
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={invoices}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              loading={loading}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'text.primary' },
                '& .MuiDataGrid-columnHeaders': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  '& .MuiDataGrid-columnHeader': {
                    color: 'text.primary',
                    fontWeight: 600 } },
                '& .MuiDataGrid-row': {
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.05)' } },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.02)' } }}
            />
          </Box>
        </CardContent>
      </GlassCard>

      {invoices.length === 0 && !loading && (
        <Box textAlign="center" py={8}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              margin: '0 auto 16px' }}
          >
            <ReceiptIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No invoices found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your invoices will appear here once generated.
          </Typography>
        </Box>
      )}

      {/* Invoice Details Dialog */}
      <Dialog
        open={invoiceDialog}
        onClose={() => setInvoiceDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(26, 26, 46, 0.9)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)' } }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" fontWeight={600}>
            Invoice Details
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedInvoice && (
            <Box>
              <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Invoice Number
                  </Typography>
                  <Typography variant="h6" fontWeight="medium" sx={{ color: '#667eea' }}>
                    {selectedInvoice.invoiceNumber}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={selectedInvoice.status}
                    sx={{
                      background: `${alpha(getStatusColor(selectedInvoice.status), 0.2)}`,
                      color: getStatusColor(selectedInvoice.status),
                      border: `1px solid ${alpha(getStatusColor(selectedInvoice.status), 0.3)}`,
                      fontWeight: 500,
                      textTransform: 'capitalize' }}
                  />
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Issue Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Due Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Invoice Items
              </Typography>
              <Box
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  
                  p: 3,
                  mb: 3 }}
              >
                {(selectedInvoice.Items || selectedInvoice.InvoiceItems || []).length > 0 ? (
                  (selectedInvoice.Items || selectedInvoice.InvoiceItems).map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" py={1}>
                      <Typography variant="body2">
                        {item.description || item.name || 'Line item'}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(item.amount ?? item.totalPrice ?? item.unitPrice ?? 0)}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    No items found
                  </Typography>
                )}
              </Box>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{
                  p: 3,
                  background: 'rgba(102, 126, 234, 0.1)',
                  
                  border: '1px solid rgba(102, 126, 234, 0.2)' }}
              >
                <Typography variant="h6" fontWeight={600}>
                  Total Amount
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text' }}
                >
                  {formatCurrency(selectedInvoice.totalAmount)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
          <Button
            onClick={() => setInvoiceDialog(false)}
            sx={{
              
              textTransform: 'none',
              fontWeight: 500 }}
          >
            Close
          </Button>
          {selectedInvoice && isAdminUser && selectedInvoice.status !== 'paid' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkInvoicePaid}
              disabled={markingPaid}
              sx={{ textTransform: 'none', fontWeight: 500 }}
            >
              {markingPaid ? 'Saving…' : 'Mark paid'}
            </Button>
          )}
          {selectedInvoice && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadPdf(selectedInvoice)}
              disabled={downloading[selectedInvoice.id]}
              sx={{
                
                textTransform: 'none',
                fontWeight: 500,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c8df0 0%, #8b5fb8 100%)',
                  transform: 'translateY(-1px)' } }}
            >
              {downloading[selectedInvoice.id] ? 'Downloading...' : 'Download PDF'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;

