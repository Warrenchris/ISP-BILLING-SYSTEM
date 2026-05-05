import React, { useEffect, useMemo, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button,
    Box,
    Tabs,
    Tab,
    CircularProgress,
    TextField,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Divider,
    Typography
} from '@mui/material';
import {
    Cancel as CancelIcon, Pause as PauseIcon, PlayArrow as PlayArrowIcon,
    SwapHoriz as SwapHorizIcon,
    Event as EventIcon,
    History as HistoryIcon
} from '@mui/icons-material';
import { formatDate } from '../../utils/helpers';
import { useApi } from '../../contexts/ApiContext';
import { useNotification } from '../../contexts/NotificationContext';
import AppBadge from '../AppBadge';

const UserSubscriptionsDialog = ({ open, onClose, user, subscriptions, loading, onAction, onRefresh }) => {
    const { subscriptionsApi, dataPlansApi } = useApi();
    const { notifyError, notifySuccess } = useNotification();

    const [tab, setTab] = useState(0); // 0 = Manage, 1 = History

    // History state
    const [historySubs, setHistorySubs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Change plan dialog state
    const [changePlanOpen, setChangePlanOpen] = useState(false);
    const [changingPlan, setChangingPlan] = useState(false);
    const [planOptions, setPlanOptions] = useState([]);
    const [planLoading, setPlanLoading] = useState(false);
    const [targetSub, setTargetSub] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [resetDates, setResetDates] = useState(true);
    const [resetData, setResetData] = useState(false);

    // Extend dialog state
    const [extendOpen, setExtendOpen] = useState(false);
    const [extending, setExtending] = useState(false);
    const [extendDays, setExtendDays] = useState(30);
    const [extendAddData, setExtendAddData] = useState(0);

    const safeUserId = user?.id;

    const fetchHistory = async () => {
        if (!safeUserId) return;
        try {
            setHistoryLoading(true);
            const res = await subscriptionsApi.getAllAdmin({ userId: safeUserId, limit: 500, sortOrder: 'DESC' });
            const list = res?.data?.data?.subscriptions || [];
            setHistorySubs(Array.isArray(list) ? list : []);
        } catch (e) {
            console.error(e);
            notifyError('Failed to load subscription history');
            setHistorySubs([]);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchPlans = async () => {
        try {
            setPlanLoading(true);
            const res = await dataPlansApi.getAll();
            const raw = res?.data?.data;
            const list =
                Array.isArray(raw?.dataPlans) ? raw.dataPlans :
                    Array.isArray(raw) ? raw :
                        [];
            setPlanOptions(list);
        } catch (e) {
            console.error(e);
            notifyError('Failed to load plans');
            setPlanOptions([]);
        } finally {
            setPlanLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        // default to Manage tab when reopened
        setTab(0);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        if (tab !== 1) return;
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tab, safeUserId]);

    const openChangePlan = async (sub) => {
        setTargetSub(sub);
        setSelectedPlanId(sub?.planId || '');
        setResetDates(true);
        setResetData(false);
        setChangePlanOpen(true);
        if (planOptions.length === 0) {
            await fetchPlans();
        }
    };

    const submitChangePlan = async () => {
        if (!targetSub?.id) return;
        if (!selectedPlanId) {
            notifyError('Select a plan');
            return;
        }
        try {
            setChangingPlan(true);
            await subscriptionsApi.changePlan(targetSub.id, {
                planId: selectedPlanId,
                resetDates,
                resetData
            });
            notifySuccess('Plan updated');
            setChangePlanOpen(false);
            await fetchHistory();
            if (typeof onRefresh === 'function') onRefresh();
        } catch (e) {
            console.error(e);
            notifyError(e.response?.data?.message || 'Failed to change plan');
        } finally {
            setChangingPlan(false);
        }
    };

    const openExtend = (sub) => {
        setTargetSub(sub);
        setExtendDays(30);
        setExtendAddData(0);
        setExtendOpen(true);
    };

    const submitExtend = async () => {
        if (!targetSub?.id) return;
        const days = Number(extendDays);
        const addDataMB = Number(extendAddData);
        if (!Number.isFinite(days) || days < 1 || days > 365) {
            notifyError('Days must be between 1 and 365');
            return;
        }
        if (!Number.isFinite(addDataMB) || addDataMB < 0) {
            notifyError('Add data must be 0 or more');
            return;
        }
        try {
            setExtending(true);
            await subscriptionsApi.extend(targetSub.id, {
                days,
                addDataMB: addDataMB > 0 ? addDataMB : undefined
            });
            notifySuccess('Subscription extended');
            setExtendOpen(false);
            await fetchHistory();
            if (typeof onRefresh === 'function') onRefresh();
        } catch (e) {
            console.error(e);
            notifyError(e.response?.data?.message || 'Failed to extend subscription');
        } finally {
            setExtending(false);
        }
    };

    const manageRows = subscriptions || [];

    const historyRows = useMemo(() => {
        const list = historySubs || [];
        return list.map((s) => ({
            ...s,
            DataPlan: s.DataPlan || s.plan || s.DataPlan
        }));
    }, [historySubs]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                style: {
                    backgroundColor: 'background.paper',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    
                    color: 'text.primary'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', p: 3 }}>
                <h3 className="text-xl font-bold text-white">Subscription Management</h3>
                <p className="text-sm text-gray-400 mt-1">
                    Managing subscriptions for <span className="text-white font-semibold">{user?.firstName} {user?.lastName}</span>
                </p>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ px: 3, pt: 2 }}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                        <Tab icon={<HistoryIcon />} iconPosition="start" label="Manage" />
                        <Tab icon={<EventIcon />} iconPosition="start" label="History" />
                    </Tabs>
                </Box>
                <Divider />

                {tab === 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-4 font-medium">Plan Details</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium">Data Usage</th>
                                    <th className="p-4 font-medium">Duration</th>
                                    <th className="p-4 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : manageRows.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No subscriptions found.</td></tr>
                                ) : (
                                    manageRows.map(sub => (
                                        <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <p className="text-white font-medium">{sub.DataPlan?.name}</p>
                                                <p className="text-xs text-gray-500 font-mono">#{sub.subscriptionNumber}</p>
                                            </td>
                                            <td className="p-4">
                                                <AppBadge type="status" value={sub.status} />
                                            </td>
                                            <td className="p-4">
                                                <div className="w-32">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-gray-400">Used</span>
                                                        <span className="text-white">
                                                            {sub.DataPlan?.dataLimit
                                                                ? `${Math.round((sub.dataUsed / sub.DataPlan?.dataLimit) * 100)}%`
                                                                : '—'}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${(sub.DataPlan?.dataLimit && (sub.dataUsed / sub.DataPlan?.dataLimit) > 0.9) ? 'bg-red-500' : 'bg-blue-500'
                                                                }`}
                                                            style={{ width: `${sub.DataPlan?.dataLimit ? Math.min(100, (sub.dataUsed / sub.DataPlan?.dataLimit) * 100) : 0}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <p className="text-sm text-gray-300">{formatDate(sub.startDate)}</p>
                                                <p className="text-xs text-gray-500">to {formatDate(sub.endDate)}</p>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    {/* Existing status actions */}
                                                    {sub.status === 'active' && (
                                                        <>
                                                            <button
                                                                onClick={() => onAction(sub.id, 'suspend')}
                                                                className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10 transition-colors"
                                                                title="Suspend"
                                                            >
                                                                <PauseIcon fontSize="small" />
                                                            </button>
                                                            <button
                                                                onClick={() => onAction(sub.id, 'cancel')}
                                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                                                title="Cancel"
                                                            >
                                                                <CancelIcon fontSize="small" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {sub.status === 'suspended' && (
                                                        <button
                                                            onClick={() => onAction(sub.id, 'activate')}
                                                            className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
                                                            title="Activate"
                                                        >
                                                            <PlayArrowIcon fontSize="small" />
                                                        </button>
                                                    )}

                                                    {/* New admin actions */}
                                                    <button
                                                        onClick={() => openChangePlan(sub)}
                                                        className="p-1.5 rounded-lg text-blue-300 hover:bg-blue-300/10 transition-colors"
                                                        title="Change plan"
                                                    >
                                                        <SwapHorizIcon fontSize="small" />
                                                    </button>
                                                    <button
                                                        onClick={() => openExtend(sub)}
                                                        className="p-1.5 rounded-lg text-purple-300 hover:bg-purple-300/10 transition-colors"
                                                        title="Extend subscription"
                                                    >
                                                        <EventIcon fontSize="small" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 1 && (
                    <Box sx={{ p: 3 }}>
                        {historyLoading ? (
                            <Box display="flex" alignItems="center" justifyContent="center" py={6}>
                                <CircularProgress />
                            </Box>
                        ) : historyRows.length === 0 ? (
                            <Typography color="text.secondary">No subscription history found.</Typography>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-3 font-medium">Plan</th>
                                            <th className="p-3 font-medium">Status</th>
                                            <th className="p-3 font-medium">Start</th>
                                            <th className="p-3 font-medium">End</th>
                                            <th className="p-3 font-medium">Data</th>
                                            <th className="p-3 font-medium">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {historyRows.map((s) => {
                                            const plan = s.DataPlan || s.plan;
                                            const used = Number(s.dataUsed || 0);
                                            const limit = Number(plan?.dataLimit || 0);
                                            return (
                                                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-3">
                                                        <Typography variant="body2" fontWeight={600}>{plan?.name || '—'}</Typography>
                                                        <Typography variant="caption" color="text.secondary" fontFamily="monospace">#{s.subscriptionNumber}</Typography>
                                                    </td>
                                                    <td className="p-3">
                                                        <AppBadge type="status" value={s.status} />
                                                    </td>
                                                    <td className="p-3">{formatDate(s.startDate)}</td>
                                                    <td className="p-3">{formatDate(s.endDate)}</td>
                                                    <td className="p-3">
                                                        {limit ? `${used} / ${limit} MB` : `${used} MB`}
                                                    </td>
                                                    <td className="p-3">
                                                        {formatDate(s.createdAt || s.created_at)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={onClose} variant="outlined" sx={{ color: 'text.primary', borderColor: 'rgba(255,255,255,0.2)' }}>Close</Button>
            </DialogActions>

            {/* Change Plan Dialog */}
            <Dialog open={changePlanOpen} onClose={() => !changingPlan && setChangePlanOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Change Plan</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        select
                        fullWidth
                        label="Plan"
                        value={selectedPlanId}
                        onChange={(e) => setSelectedPlanId(e.target.value)}
                        disabled={planLoading || changingPlan}
                        sx={{ mb: 2 }}
                    >
                        {planOptions.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                                {p.name} ({p.validityPeriod} days)
                            </MenuItem>
                        ))}
                    </TextField>

                    <FormControlLabel
                        control={<Checkbox checked={resetDates} onChange={(e) => setResetDates(e.target.checked)} />}
                        label="Reset dates"
                    />
                    <FormControlLabel
                        control={<Checkbox checked={resetData} onChange={(e) => setResetData(e.target.checked)} />}
                        label="Reset data"
                    />
                    {planLoading && (
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <CircularProgress size={18} />
                            <Typography variant="caption" color="text.secondary">Loading plans…</Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setChangePlanOpen(false)} disabled={changingPlan}>Cancel</Button>
                    <Button variant="contained" onClick={submitChangePlan} disabled={changingPlan || !selectedPlanId}>
                        {changingPlan ? <CircularProgress size={18} color="inherit" /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Extend Subscription Dialog */}
            <Dialog open={extendOpen} onClose={() => !extending && setExtendOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Extend Subscription</DialogTitle>
                <DialogContent sx={{ pt: 2 }}>
                    <TextField
                        type="number"
                        fullWidth
                        label="Add days"
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                        inputProps={{ min: 1, max: 365 }}
                        disabled={extending}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        type="number"
                        fullWidth
                        label="Add data (MB)"
                        value={extendAddData}
                        onChange={(e) => setExtendAddData(e.target.value)}
                        inputProps={{ min: 0 }}
                        disabled={extending}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExtendOpen(false)} disabled={extending}>Cancel</Button>
                    <Button variant="contained" onClick={submitExtend} disabled={extending}>
                        {extending ? <CircularProgress size={18} color="inherit" /> : 'Extend'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Dialog>
    );
};

export default UserSubscriptionsDialog;
