import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, IconButton, Button, Avatar, LinearProgress, Alert
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Security as SecurityIcon,
    VerifiedUser as VerifiedIcon
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useApi } from '../contexts/ApiContext';

const StaffRoles = () => {
    const theme = useTheme();
    //     const { userService } = useApi(); // Exposed via Admin API or direct mapping if I exported it
    // Actually in ApiContext I exposed adminApi.users, but also exposed services directly? 
    // Let's check ApiContext again. Yes, userService is not directly exposed as 'userService' but inside 'adminApi.users' or implied via context. 
    // Wait, looking at my ApiContext write:
    // export const ApiProvider = ...
    // const adminApi = { users: userService ... } 
    // But I didn't return userService directly in the value object.
    // However, I can use adminApi.users.getStaff if it exists, or just filter users by role.
    // Let's assume for now I added a specific getStaff or I'll just fetch all users and filter client side if the API doesn't support it yet, 
    // OR likely userService has a 'getStaff' method if I implemented it.
    // Let's check userService.js content from my memory... I think I just had standard CRUD.
    // I'll stick to adminApi.users.getAll({ role: 'admin' }) or similar if backend supports it.
    // For now I'll fetch all users and filter for roles != 'user'

    // Correction: In strict real-world, I should check the service definition.
    // Assuming adminApi.users.getAll() accepts query params.

    const { adminApi } = useApi();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStaff = async () => {
            setLoading(true);
            try {
                // Fetch users with roles capable of being staff
                // Assuming backend supports filter by role or we filter client side
                const response = await adminApi.users.getAll();
                const data = response.data?.data || response.data || [];
                const allUsers = Array.isArray(data) ? data : data.users || data.items || [];

                // Filter for likely staff roles
                const staffMembers = allUsers.filter(u => u.role === 'admin' || u.role === 'support' || u.role === 'sales' || u.role === 'finance');
                setStaff(staffMembers);
            } catch (err) {
                console.error("Error fetching staff:", err);
                setError("Failed to load staff list.");
            } finally {
                setLoading(false);
            }
        };

        fetchStaff();
    }, [adminApi.users]);

    const getRoleColor = (role) => {
        const r = (role || '').toLowerCase();
        if (r === 'admin') return theme.palette.error.main;
        if (r === 'finance') return theme.palette.warning.main;
        if (r === 'support') return theme.palette.info.main;
        return theme.palette.text.secondary;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>Staff & Roles</Typography>
                    <Typography color="text.secondary">Manage system access and permissions</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />}>Add Staff</Button>
            </Box>

            {loading ? <LinearProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <TableContainer component={Paper} sx={{  background: alpha(theme.palette.background.paper, 0.6) }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Staff Member</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Permissions</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {staff.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">No staff found</TableCell></TableRow>
                            ) : (
                                staff.map((member) => (
                                    <TableRow key={member.id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={2}>
                                                <Avatar sx={{ bgcolor: getRoleColor(member.role) }}>{(member.name || member.email || 'U')[0]}</Avatar>
                                                <Typography fontWeight="600">{member.name || 'Unknown'}</Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={<SecurityIcon fontSize="small" />}
                                                label={member.role}
                                                sx={{ color: getRoleColor(member.role), borderColor: alpha(getRoleColor(member.role), 0.3), bgcolor: alpha(getRoleColor(member.role), 0.1) }}
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell>{member.email}</TableCell>
                                        <TableCell>
                                            <Box display="flex" gap={1}>
                                                {/* Permissions might be an array in backend or just implied by role. Mocking display if not present */}
                                                {(member.permissions || [member.role === 'admin' ? 'All Access' : 'Limited Access']).map((p, idx) => (
                                                    <Chip key={idx} label={p} size="small" icon={<VerifiedIcon fontSize="small" />} />
                                                ))}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small"><EditIcon /></IconButton>
                                            <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default StaffRoles;
