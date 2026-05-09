import React, { useState, useCallback, useMemo } from 'react';
import AppBadge from '../components/AppBadge';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem, Avatar, Grid,
    Skeleton, Alert, Pagination, Collapse, Drawer, Divider,
    Menu, ListItemIcon, ListItemText, Tooltip, CircularProgress,
    Checkbox, FormControlLabel } from '@mui/material';
import {
    Add as AddIcon,
    FilterList as FilterListIcon,
    MoreVert as MoreVertIcon,
    BugReport as BugIcon,
    Payment as PaymentIcon,
    NetworkCheck as NetworkIcon,
    Help as HelpIcon,
    ShoppingCart as ShoppingCartIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    Edit as EditIcon,
    DeleteOutline as DeleteIcon,
    AssignmentInd as AssignIcon,
    CheckCircleOutline as ResolveIcon,
    PlayCircleOutline as ProgressIcon,
    Search as SearchIcon } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

import useTickets from '../hooks/useTickets';
import { supportService } from '../services/supportService';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, debounce } from '../utils/helpers';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const ICON_MAP = {
    NetworkCheck:  <NetworkIcon    fontSize="small" />,
    Payment:       <PaymentIcon    fontSize="small" />,
    ShoppingCart:  <ShoppingCartIcon fontSize="small" />,
    Help:          <HelpIcon       fontSize="small" />,
    BugReport:     <BugIcon        fontSize="small" /> };

const ACTION_META = {
    edit:        { label: 'Edit',         Icon: EditIcon,     color: 'inherit'  },
    assign:      { label: 'Assign',       Icon: AssignIcon,   color: 'inherit'  },
    in_progress: { label: 'Mark In Progress', Icon: ProgressIcon, color: 'inherit' },
    resolve:     { label: 'Mark Resolved',Icon: ResolveIcon,  color: 'success.main' },
    close:       { label: 'Close Ticket', Icon: CloseIcon,    color: 'warning.main' },
    delete:      { label: 'Delete',       Icon: DeleteIcon,   color: 'error.main'   } };

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length >= 2
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0][0].toUpperCase();
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function SkeletonRows({ count = 5 }) {
    return Array.from({ length: count }).map((_, i) => (
        <TableRow key={i}>
            {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}><Skeleton variant="text" animation="wave" /></TableCell>
            ))}
        </TableRow>
    ));
}

function StatusBadge({ status, labelsConfig }) {
    const cfg  = labelsConfig?.statuses?.[status] || {};
    const hex  = cfg.hex  || '#6b7280';
    const label = status?.replace('_', ' ') || status;
    return (
        <Chip
            label={label}
            size="small"
            sx={{
                bgcolor:      alpha(hex, 0.12),
                color:        hex,
                
                fontWeight:   600,
                textTransform: 'capitalize' }}
        />
    );
}

function PriorityBadge({ priority, labelsConfig }) {
    const cfg = labelsConfig?.priorities?.[priority] || {};
    const hex = cfg.hex || '#6b7280';
    return (
        <Typography variant="body2" sx={{ color: hex, fontWeight: 700, textTransform: 'capitalize' }}>
            {priority}
        </Typography>
    );
}

function CategoryChip({ category, categories }) {
    const cat  = categories.find(c => c.value === category);
    const icon = cat ? (ICON_MAP[cat.icon] || <HelpIcon fontSize="small" />) : <HelpIcon fontSize="small" />;
    return (
        <Chip
            icon={icon}
            label={cat?.label || category}
            size="small"
            sx={{  textTransform: 'capitalize' }}
        />
    );
}

function AssigneeCell({ staff }) {
    if (!staff) {
        return <Typography variant="caption" color="text.secondary">Unassigned</Typography>;
    }
    const name = `${staff.firstName} ${staff.lastName}`;
    return (
        <Chip
            avatar={<Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>{getInitials(name)}</Avatar>}
            label={name}
            size="small"
            variant="outlined"
        />
    );
}

/* ─── Filter Drawer ──────────────────────────────────────────────────────── */

function FilterDrawer({ open, onClose, categories, priorities, statuses, staff, filters, onApply }) {
    const [local, setLocal] = useState(filters);

    const set = (key, val) => setLocal(prev => ({ ...prev, [key]: val }));

    const handleApply = () => {
        // Strip empty strings
        const cleaned = Object.fromEntries(
            Object.entries(local).filter(([, v]) => v && v !== '')
        );
        onApply(cleaned);
        onClose();
    };

    const handleClear = () => {
        setLocal({});
        onApply({});
        onClose();
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}
            PaperProps={{ sx: { width: 320, p: 3 } }}
        >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={700}>Filter Tickets</Typography>
                <IconButton onClick={onClose}><CloseIcon /></IconButton>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Box display="flex" flexDirection="column" gap={2.5}>
                <TextField select fullWidth label="Category" value={local.category || ''}
                    onChange={e => set('category', e.target.value)}>
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Priority" value={local.priority || ''}
                    onChange={e => set('priority', e.target.value)}>
                    <MenuItem value="">All Priorities</MenuItem>
                    {priorities.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Status" value={local.status || ''}
                    onChange={e => set('status', e.target.value)}>
                    <MenuItem value="">All Statuses</MenuItem>
                    {statuses.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </TextField>

                <TextField select fullWidth label="Assigned To" value={local.assignedTo || ''}
                    onChange={e => set('assignedTo', e.target.value)}>
                    <MenuItem value="">All Staff</MenuItem>
                    {staff.map(s => (
                        <MenuItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</MenuItem>
                    ))}
                </TextField>
            </Box>

            <Box display="flex" gap={1.5} mt={4}>
                <Button fullWidth variant="outlined" onClick={handleClear}>Clear</Button>
                <Button fullWidth variant="contained" onClick={handleApply}>Apply Filters</Button>
            </Box>
        </Drawer>
    );
}

/* ─── Create Ticket Dialog ───────────────────────────────────────────────── */

const EMPTY_FORM = { subject: '', category: '', priority: '', description: '' };

function CreateTicketDialog({ open, onClose, categories, priorities, staff, onSuccess }) {
    const [form,       setForm]       = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [formError,  setFormError]  = useState(null);

    const handleClose = () => {
        setForm(EMPTY_FORM);
        setFormError(null);
        onClose();
    };

    const handleSubmit = async () => {
        if (!form.subject.trim()) { setFormError('Subject is required'); return; }
        if (!form.description.trim()) { setFormError('Description is required'); return; }

        setSubmitting(true);
        setFormError(null);
        try {
            await supportService.create({
                subject:     form.subject.trim(),
                description: form.description.trim(),
                category:    form.category   || 'general',
                priority:    form.priority   || 'low' });
            onSuccess();
            handleClose();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Failed to create ticket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm"
            PaperProps={{ sx: { } }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Create New Ticket</DialogTitle>
            <DialogContent>
                {formError && (
                    <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
                )}
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth label="Subject" required
                            value={form.subject}
                            onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                        />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select fullWidth label="Category"
                            value={form.category}
                            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                            {categories.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select fullWidth label="Priority"
                            value={form.priority}
                            onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                            {priorities.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
                        </TextField>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <TextField
                            fullWidth multiline rows={4} label="Description" required
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleClose} disabled={submitting}>Cancel</Button>
                <Button
                    variant="contained" onClick={handleSubmit}
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                    {submitting ? 'Creating…' : 'Create Ticket'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/* ─── Row Action Menu ────────────────────────────────────────────────────── */

function RowActionMenu({ ticket, onActionComplete, onAssignClick }) {
    const [anchor,  setAnchor]  = useState(null);
    const [working, setWorking] = useState(false);

    const allowed = ticket.allowedActions || [];

    const handleAction = async (action) => {
        setAnchor(null);
        if (action === 'assign') {
            if (onAssignClick) onAssignClick(ticket);
            return;
        }
        setWorking(true);
        try {
            switch (action) {
                case 'close':       await supportService.close(ticket.id);                  break;
                case 'resolve':     await supportService.update(ticket.id, { status: 'resolved' });   break;
                case 'in_progress': await supportService.update(ticket.id, { status: 'in_progress' }); break;
                case 'delete':      await supportService.delete(ticket.id);                 break;
                default: break;
            }
            onActionComplete();
        } catch (err) {
            console.error('Action failed:', err);
        } finally {
            setWorking(false);
        }
    };

    const actions = allowed.filter(a => a !== 'view' && ACTION_META[a]);

    if (!actions.length) return null;

    return (
        <>
            <IconButton size="small" disabled={working} onClick={e => setAnchor(e.currentTarget)}>
                {working ? <CircularProgress size={16} /> : <MoreVertIcon />}
            </IconButton>
            <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                {actions.map(action => {
                    const { label, Icon, color } = ACTION_META[action];
                    return (
                        <MenuItem key={action} onClick={() => handleAction(action)}
                            sx={{ color, gap: 1 }}>
                            <ListItemIcon sx={{ color }}>
                                <Icon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>{label}</ListItemText>
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

const SupportTickets = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const isStaffUser = ['admin', 'support'].includes(user?.role);

    // ─── Local UI state ───────────────────────────────────────────────────────
    const [searchInput,    setSearchInput]    = useState('');
    const [search,         setSearch]         = useState('');
    const [filters,        setFilters]        = useState({});
    const [page,           setPage]           = useState(1);
    const [filterOpen,     setFilterOpen]     = useState(false);
    const [createOpen,     setCreateOpen]     = useState(false);
    const [assignOpen,     setAssignOpen]     = useState(false);
    const [assignTicket,   setAssignTicket]   = useState(null);
    const [assignStaffId,  setAssignStaffId]  = useState('');
    const [assignSaving,   setAssignSaving]   = useState(false);
    const [detailOpen,     setDetailOpen]     = useState(false);
    const [detailTicket,   setDetailTicket]   = useState(null);
    const [replies,        setReplies]        = useState([]);
    const [repliesLoading, setRepliesLoading] = useState(false);
    const [replyMessage,   setReplyMessage]   = useState('');
    const [replyInternal,  setReplyInternal]  = useState(false);
    const [replySubmitting,setReplySubmitting]= useState(false);

    const LIMIT = 20;

    const openAssignDialog = (ticket) => {
        setAssignTicket(ticket);
        setAssignStaffId(ticket.assignedTo || '');
        setAssignOpen(true);
    };

    const confirmAssign = async () => {
        if (!assignTicket) return;
        setAssignSaving(true);
        try {
            await supportService.assign(assignTicket.id, assignStaffId || null);
            setAssignOpen(false);
            setAssignTicket(null);
            refresh();
        } catch (err) {
            console.error('Assign failed:', err);
        } finally {
            setAssignSaving(false);
        }
    };

    const openDetailDialog = async (ticket) => {
        setDetailTicket(ticket);
        setDetailOpen(true);
        setReplies([]);
        setReplyMessage('');
        setReplyInternal(false);
        try {
            setRepliesLoading(true);
            const res = await supportService.getReplies(ticket.id);
            setReplies(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load replies:', err);
        } finally {
            setRepliesLoading(false);
        }
    };

    const submitReply = async () => {
        if (!detailTicket?.id) return;
        const msg = replyMessage.trim();
        if (!msg) return;
        try {
            setReplySubmitting(true);
            await supportService.addReply(detailTicket.id, {
                message: msg,
                isInternal: isStaffUser ? replyInternal : false
            });
            setReplyMessage('');
            setReplyInternal(false);
            const res = await supportService.getReplies(detailTicket.id);
            setReplies(res.data?.data || []);
            refresh();
        } catch (err) {
            console.error('Reply failed:', err);
        } finally {
            setReplySubmitting(false);
        }
    };

    // ─── Data ─────────────────────────────────────────────────────────────────
    const {
        tickets, loading, error, pagination, refresh,
        categories, priorities, statuses, staff, labelsConfig } = useTickets({ search, filters, page, limit: LIMIT });

    // ─── Debounced search ─────────────────────────────────────────────────────
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSetSearch = useCallback(
        debounce((val) => { setSearch(val); setPage(1); }, 400),
        []
    );

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
        debouncedSetSearch(e.target.value);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setPage(1);
    };

    const activeFilterCount = useMemo(() => Object.keys(filters).length, [filters]);

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <Box sx={{ p: 3 }}>
            {/* ── Header ── */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography
                        variant="h3"
                        sx={{
                            fontWeight: 700, mb: 0.5,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor:  'transparent' }}
                    >
                        Support Tickets
                    </Typography>
                    <Typography color="text.secondary">
                        Manage and track customer support requests
                    </Typography>
                </Box>

                <Box display="flex" gap={1.5}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={refresh} disabled={loading}>
                            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </Tooltip>
                    <Button
                        id="create-ticket-btn"
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateOpen(true)}
                        sx={{ }}
                    >
                        Create Ticket
                    </Button>
                </Box>
            </Box>

            {/* ── Search & Filter bar ── */}
            <Paper sx={{ p: 2, mb: 3,  background: alpha(theme.palette.background.paper, 0.6) }}>
                <Box display="flex" gap={2}>
                    <TextField
                        id="ticket-search"
                        fullWidth
                        placeholder="Search tickets by subject…"
                        size="small"
                        value={searchInput}
                        onChange={handleSearchChange}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />,
                            sx: { } }}
                    />
                    <Button
                        id="ticket-filter-btn"
                        variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
                        startIcon={<FilterListIcon />}
                        onClick={() => setFilterOpen(true)}
                        sx={{  whiteSpace: 'nowrap' }}
                    >
                        Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                    </Button>
                </Box>

                {/* Active filter pills */}
                {activeFilterCount > 0 && (
                    <Collapse in>
                        <Box display="flex" gap={1} mt={1.5} flexWrap="wrap">
                            {Object.entries(filters).map(([key, val]) => (
                                <Chip
                                    key={key}
                                    label={`${key}: ${val}`}
                                    size="small"
                                    onDelete={() => {
                                        const next = { ...filters };
                                        delete next[key];
                                        setFilters(next);
                                        setPage(1);
                                    }}
                                    sx={{  textTransform: 'capitalize' }}
                                />
                            ))}
                        </Box>
                    </Collapse>
                )}
            </Paper>

            {/* ── Error state ── */}
            {error && (
                <Alert
                    severity="error"
                    action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>}
                    sx={{ mb: 3 }}
                >
                    {error}
                </Alert>
            )}

            {/* ── Table ── */}
            <TableContainer
                component={Paper}
                sx={{  background: alpha(theme.palette.background.paper, 0.6) }}
            >
                <Table id="tickets-table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Ticket ID</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Assigned To</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Created</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <SkeletonRows count={LIMIT > 8 ? 8 : LIMIT} />
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">
                                        {error ? 'Could not load tickets.' : 'No tickets found.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map(ticket => (
                                <TableRow
                                    key={ticket.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => openDetailDialog(ticket)}
                                >
                                    {/* Ticket ID */}
                                    <TableCell sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                                        {ticket.id?.slice(0, 8).toUpperCase() || '—'}
                                    </TableCell>

                                    {/* Subject + customer name */}
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>
                                                {ticket.subject}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {ticket.customerName ||
                                                    (ticket.User
                                                        ? `${ticket.User.firstName} ${ticket.User.lastName}`
                                                        : '—')}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    {/* Category */}
                                    <TableCell>
                                        <CategoryChip category={ticket.category} categories={categories} />
                                    </TableCell>

                                    {/* Priority */}
                                    <TableCell>
                                        <PriorityBadge priority={ticket.priority} labelsConfig={labelsConfig} />
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>
                                        <StatusBadge status={ticket.status} labelsConfig={labelsConfig} />
                                    </TableCell>

                                    {/* Assigned To */}
                                    <TableCell>
                                        <AssigneeCell staff={ticket.Staff} />
                                    </TableCell>

                                    {/* Date */}
                                    <TableCell>
                                        <Typography variant="body2">
                                            {formatDate(ticket.createdAt)}
                                        </Typography>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                        <RowActionMenu
                                            ticket={ticket}
                                            onActionComplete={refresh}
                                            onAssignClick={openAssignDialog}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ── Pagination ── */}
            {pagination.pages > 1 && (
                <Box display="flex" justifyContent="center" mt={3}>
                    <Pagination
                        count={pagination.pages}
                        page={page}
                        onChange={(_, val) => setPage(val)}
                        color="primary"
                        shape="rounded"
                    />
                </Box>
            )}

            {/* ── Filter Drawer ── */}
            <FilterDrawer
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                categories={categories}
                priorities={priorities}
                statuses={statuses}
                staff={staff}
                filters={filters}
                onApply={handleApplyFilters}
            />

            {/* ── Create Ticket Dialog ── */}
            <CreateTicketDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                categories={categories}
                priorities={priorities}
                staff={staff}
                onSuccess={() => { setPage(1); refresh(); }}
            />

            <Dialog open={assignOpen} onClose={() => !assignSaving && setAssignOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 700 }}>Assign ticket</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {assignTicket?.subject}
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        label="Staff member"
                        value={assignStaffId}
                        onChange={(e) => setAssignStaffId(e.target.value)}
                        disabled={assignSaving}
                    >
                        <MenuItem value="">
                            <em>Unassigned</em>
                        </MenuItem>
                        {staff.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                                {s.firstName} {s.lastName} ({s.role})
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setAssignOpen(false)} disabled={assignSaving}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={confirmAssign}
                        disabled={assignSaving}
                        startIcon={assignSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 700 }}>Ticket Details</DialogTitle>
                <DialogContent>
                    {detailTicket && (
                        <Box>
                            <Grid container spacing={2} sx={{ mb: 2 }}>
                                <Grid size={{ xs: 12, md: 8 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Subject</Typography>
                                    <Typography variant="h6" sx={{ mb: 1 }}>{detailTicket.subject}</Typography>
                                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                                    <Typography variant="body2">{detailTicket.description}</Typography>
                                </Grid>
                                <Grid size={{ xs: 12, md: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                                    <AppBadge type="status" value={detailTicket.status} />
                                    <Box mt={1}>
                                        <Typography variant="subtitle2" color="text.secondary">Priority</Typography>
                                        <AppBadge type="priority" value={detailTicket.priority} />
                                    </Box>
                                    <Box mt={1}>
                                        <Typography variant="subtitle2" color="text.secondary">Assigned to</Typography>
                                        <Typography variant="body2">
                                            {detailTicket?.Staff ? `${detailTicket.Staff.firstName} ${detailTicket.Staff.lastName}` : 'Unassigned'}
                                        </Typography>
                                    </Box>
                                    <Box mt={1}>
                                        <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                                        <Typography variant="body2">{formatDate(detailTicket.createdAt)}</Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" sx={{ mb: 1 }}>Reply Thread</Typography>
                            <Box sx={{ maxHeight: 280, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                                {repliesLoading ? (
                                    <Box display="flex" justifyContent="center" py={2}>
                                        <CircularProgress size={22} />
                                    </Box>
                                ) : replies.length === 0 ? (
                                    <Typography color="text.secondary">No replies yet.</Typography>
                                ) : (
                                    replies.map((r) => (
                                        <Box key={r.id} sx={{ mb: 1.5, p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                {(r.author?.firstName || '')} {(r.author?.lastName || '')} ({r.author?.role || 'user'}) · {formatDate(r.createdAt || r.created_at)}
                                                {r.isInternal ? ' · Internal' : ''}
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>{r.message}</Typography>
                                        </Box>
                                    ))
                                )}
                            </Box>

                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                label="Write a reply"
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                            />
                            {isStaffUser && (
                                <FormControlLabel
                                    sx={{ mt: 1 }}
                                    control={
                                        <Checkbox
                                            checked={replyInternal}
                                            onChange={(e) => setReplyInternal(e.target.checked)}
                                        />
                                    }
                                    label="Internal note"
                                />
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setDetailOpen(false)} disabled={replySubmitting}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={submitReply}
                        disabled={replySubmitting || !replyMessage.trim()}
                        startIcon={replySubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
                    >
                        {replySubmitting ? 'Sending…' : 'Send Reply'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default SupportTickets;
