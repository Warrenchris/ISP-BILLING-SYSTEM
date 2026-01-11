import React, { useState } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem, Avatar, Grid
} from '@mui/material';
import {
    Add as AddIcon,
    FilterList as FilterListIcon,
    MoreVert as MoreVertIcon,
    BugReport as BugIcon,
    Payment as PaymentIcon,
    NetworkCheck as NetworkIcon,
    Help as HelpIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

const MOCK_TICKETS = [
    { id: 'TKT-2029', user: 'Warren Chris', subject: 'Internet Slow', priority: 'High', status: 'Open', category: 'Technical', assignedTo: null, date: '2025-01-10' },
    { id: 'TKT-2028', user: 'John Doe', subject: 'Payment Issue', priority: 'Medium', status: 'In Progress', category: 'Billing', assignedTo: 'Admin', date: '2025-01-09' },
    { id: 'TKT-2027', user: 'Jane Smith', subject: 'Router Config', priority: 'Low', status: 'Closed', category: 'Technical', assignedTo: 'Tech Support', date: '2025-01-08' },
    { id: 'TKT-2026', user: 'Mike Ross', subject: 'Plan Upgrade', priority: 'Medium', status: 'Open', category: 'Sales', assignedTo: null, date: '2025-01-08' },
];

// const MOCK_STAFF = ['Admin', 'Tech Support', 'Sales Team'];

const SupportTickets = () => {
    const theme = useTheme();
    const [tickets, setTickets] = useState(MOCK_TICKETS);
    const [openDialog, setOpenDialog] = useState(false);
    const [newTicket, setNewTicket] = useState({ subject: '', category: 'Technical', priority: 'Medium', description: '' });

    const handleCreate = () => {
        setTickets([{
            id: `TKT-${2030 + tickets.length}`,
            user: 'Current User',
            ...newTicket,
            status: 'Open',
            assignedTo: null,
            date: new Date().toISOString().split('T')[0]
        }, ...tickets]);
        setOpenDialog(false);
    };

    const getPriorityColor = (p) => {
        if (p === 'High') return theme.palette.error.main;
        if (p === 'Medium') return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    const getStatusColor = (s) => {
        if (s === 'Open') return theme.palette.info.main;
        if (s === 'In Progress') return theme.palette.warning.main;
        return theme.palette.success.main;
    };

    const getCategoryIcon = (c) => {
        if (c === 'Technical') return <NetworkIcon fontSize="small" />;
        if (c === 'Billing') return <PaymentIcon fontSize="small" />;
        if (c === 'Sales') return <BugIcon fontSize="small" />;
        return <HelpIcon fontSize="small" />;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Support Tickets
                    </Typography>
                    <Typography color="text.secondary">Manage and track customer support requests</Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    sx={{ borderRadius: '12px', background: theme.palette.primary.main, color: 'black' }}
                >
                    Create Ticket
                </Button>
            </Box>

            {/* Stats Cards Row could go here */}

            <Paper sx={{ p: 2, mb: 3, borderRadius: '16px', background: alpha(theme.palette.background.paper, 0.6) }}>
                <Box display="flex" gap={2}>
                    <TextField
                        fullWidth
                        placeholder="Search tickets..."
                        size="small"
                        InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                    <Button variant="outlined" startIcon={<FilterListIcon />} sx={{ borderRadius: '12px' }}>
                        Filter
                    </Button>
                </Box>
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: '16px', background: alpha(theme.palette.background.paper, 0.6) }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ticket ID</TableCell>
                            <TableCell>Subject</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Assigned To</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tickets.map((t) => (
                            <TableRow key={t.id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{t.id}</TableCell>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2" fontWeight="500">{t.subject}</Typography>
                                        <Typography variant="caption" color="text.secondary">{t.user}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={getCategoryIcon(t.category)}
                                        label={t.category}
                                        size="small"
                                        sx={{ borderRadius: '8px' }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" color={getPriorityColor(t.priority)} fontWeight="600">
                                        {t.priority}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={t.status}
                                        size="small"
                                        sx={{
                                            bgcolor: alpha(getStatusColor(t.status), 0.1),
                                            color: getStatusColor(t.status),
                                            borderRadius: '8px'
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    {t.assignedTo ? (
                                        <Chip avatar={<Avatar sx={{ width: 24, height: 24 }}>{t.assignedTo[0]}</Avatar>} label={t.assignedTo} size="small" variant="outlined" />
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Unassigned</Typography>
                                    )}
                                </TableCell>
                                <TableCell>{t.date}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small"><MoreVertIcon /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '16px' } }}>
                <DialogTitle>Create New Ticket</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Subject" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select fullWidth label="Category" value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}>
                                {['Technical', 'Billing', 'Sales', 'General'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField select fullWidth label="Priority" value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}>
                                {['Low', 'Medium', 'High'].map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth multiline rows={4} label="Description" value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Create Ticket</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SupportTickets;
