import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button
} from '@mui/material';
import {
    Cancel as CancelIcon, Pause as PauseIcon, PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { formatDate } from '../../utils/helpers';

const UserSubscriptionsDialog = ({ open, onClose, user, subscriptions, loading, onAction }) => {
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
                    borderRadius: '16px',
                    color: 'white'
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
                            ) : subscriptions.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No subscription history found.</td></tr>
                            ) : (
                                subscriptions.map(sub => (
                                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <p className="text-white font-medium">{sub.DataPlan?.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">#{sub.subscriptionNumber}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${sub.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                sub.status === 'expired' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-gray-700 text-gray-300'
                                                }`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="w-32">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-400">Used</span>
                                                    <span className="text-white">{Math.round((sub.dataUsed / sub.DataPlan?.dataLimit) * 100)}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${(sub.dataUsed / sub.DataPlan?.dataLimit) > 0.9 ? 'bg-red-500' : 'bg-blue-500'
                                                            }`}
                                                        style={{ width: `${Math.min(100, (sub.dataUsed / sub.DataPlan?.dataLimit) * 100)}%` }}
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={onClose} variant="outlined" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserSubscriptionsDialog;
