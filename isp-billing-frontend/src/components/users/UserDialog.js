import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Button, Typography
} from '@mui/material';
import { useApi } from '../../contexts/ApiContext';

// TODO(API migration): Static fallbacks — remove once GET /api/config/roles & /api/config/user-statuses are deployed everywhere.
const FALLBACK_USER_ROLE_OPTIONS = ['customer', 'admin', 'support'];
const FALLBACK_USER_STATUS_OPTIONS = ['active', 'inactive', 'suspended'];

const titleCaseWord = (s) =>
    typeof s !== 'string' || !s
        ? ''
        : `${s.slice(0, 1).toUpperCase()}${s.slice(1).toLowerCase()}`;

const matchCanonical = (allowed, preferred, fallback) => {
    const pref = preferred != null ? String(preferred).trim().toLowerCase() : '';
    const hit = allowed.find((a) => String(a).toLowerCase() === pref);
    if (hit !== undefined) return hit;
    const fb = fallback != null ? String(fallback).toLowerCase() : '';
    const fbHit = allowed.find((a) => String(a).toLowerCase() === fb);
    return fbHit !== undefined ? fbHit : allowed[0];
};

// We'll keep using MUI Dialog for modal behavior consistency, but styling content with Tailwind
const UserDialog = ({ open, onClose, user, setUser, onSave }) => {
    const isEdit = !!user.id;
    const { api } = useApi();
    const [roleOptions, setRoleOptions] = useState(FALLBACK_USER_ROLE_OPTIONS);
    const [statusOptions, setStatusOptions] = useState(FALLBACK_USER_STATUS_OPTIONS);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        (async () => {
            try {
                const [rolesRes, stRes] = await Promise.all([
                    api.get('/config/roles'),
                    api.get('/config/user-statuses'),
                ]);
                const roles = rolesRes?.data?.data;
                const sts = stRes?.data?.data;
                if (!cancelled && Array.isArray(roles) && roles.length) {
                    setRoleOptions(roles);
                }
                if (!cancelled && Array.isArray(sts) && sts.length) {
                    setStatusOptions(sts);
                }
            } catch {
                /* FALLBACK_* */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, api]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                style: {
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    
                    color: 'text.primary'
                }
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" fontWeight="bold">
                    {isEdit ? 'Edit User' : 'Create New User'}
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
                <div className="grid gap-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="First Name"
                            value={user.firstName || ''}
                            onChange={(e) => setUser({ ...user, firstName: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: 'text.primary',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'text.primary' }
                                },
                                '& .MuiInputLabel-root': { color: 'text.secondary' }
                            }}
                        />
                        <TextField
                            label="Last Name"
                            value={user.lastName || ''}
                            onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                '& .MuiInputLabel-root': { color: 'gray' }
                            }}
                        />
                    </div>

                    <TextField
                        label="Email Address"
                        value={user.email || ''}
                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                        fullWidth
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                            '& .MuiInputLabel-root': { color: 'gray' }
                        }}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            label="Phone Number"
                            value={user.phoneNumber || ''}
                            onChange={(e) => setUser({ ...user, phoneNumber: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                '& .MuiInputLabel-root': { color: 'gray' }
                            }}
                        />
                        <TextField
                            label="Router IP"
                            value={user.routerIp || ''}
                            onChange={(e) => setUser({ ...user, routerIp: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                '& .MuiInputLabel-root': { color: 'gray' }
                            }}
                        />
                    </div>

                    {!isEdit && (
                        <div className="grid grid-cols-2 gap-4">
                            <TextField
                                label="Password"
                                type="password"
                                value={user.password || ''}
                                onChange={(e) => setUser({ ...user, password: e.target.value })}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                    '& .MuiInputLabel-root': { color: 'gray' }
                                }}
                            />
                            <TextField
                                label="Confirm Password"
                                type="password"
                                value={user.confirm || ''}
                                onChange={(e) => setUser({ ...user, confirm: e.target.value })}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                    '& .MuiInputLabel-root': { color: 'gray' }
                                }}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            select
                            label="Role"
                            value={
                                matchCanonical(roleOptions, user.role, 'customer')}
                            onChange={(e) => setUser({ ...user, role: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    color: 'text.primary',
                                    '& fieldset': { borderColor: 'divider' },
                                    '&:hover fieldset': { borderColor: 'text.primary' }
                                },
                                '& .MuiInputLabel-root': { color: 'text.secondary' },
                                '& .MuiSelect-icon': { color: 'text.primary' }
                            }}
                        >
                            {roleOptions.map((role) => (
                                <MenuItem key={role} value={role}>
                                    {titleCaseWord(role)}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Status"
                            value={
                                matchCanonical(statusOptions, user.status, 'active')}
                            onChange={(e) => setUser({ ...user, status: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'text.primary', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { bordercolor: 'text.primary' } },
                                '& .MuiInputLabel-root': { color: 'gray' },
                                '& .MuiSelect-icon': { color: 'text.primary' }
                            }}
                        >
                            {statusOptions.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {titleCaseWord(status)}
                                </MenuItem>
                            ))}
                        </TextField>
                    </div>
                </div>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={onClose} sx={{ color: 'gray', '&:hover': { color: 'text.primary' } }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onSave}
                    sx={{
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                        color: 'primary.contrastText',
                        fontWeight: 'bold'
                    }}
                    disabled={!user.firstName || !user.lastName || !user.email}
                >
                    {isEdit ? 'Update User' : 'Create User'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserDialog;
