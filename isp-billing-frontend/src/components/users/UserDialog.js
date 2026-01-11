import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Button
} from '@mui/material';
const USER_ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    STAFF: 'staff',
};

// We'll keep using MUI Dialog for modal behavior consistency, but styling content with Tailwind
const UserDialog = ({ open, onClose, user, setUser, onSave }) => {
    const isEdit = !!user.id;

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
                    borderRadius: '16px',
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
                                '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
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
                            '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
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
                                '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
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
                                '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
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
                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
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
                                    '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
                                    '& .MuiInputLabel-root': { color: 'gray' }
                                }}
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <TextField
                            select
                            label="Role"
                            value={user.role || 'customer'}
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
                            {Object.values(USER_ROLES).map((role) => (
                                <MenuItem key={role} value={role}>{role}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Status"
                            value={user.status || 'active'}
                            onChange={(e) => setUser({ ...user, status: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'white' } },
                                '& .MuiInputLabel-root': { color: 'gray' },
                                '& .MuiSelect-icon': { color: 'white' }
                            }}
                        >
                            {['active', 'inactive', 'suspended'].map((status) => (
                                <MenuItem key={status} value={status}>{status}</MenuItem>
                            ))}
                        </TextField>
                    </div>
                </div>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <Button onClick={onClose} sx={{ color: 'gray', '&:hover': { color: 'white' } }}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={onSave}
                    sx={{
                        bgcolor: 'success.main',
                        '&:hover': { bgcolor: 'success.dark' },
                        color: 'black',
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
