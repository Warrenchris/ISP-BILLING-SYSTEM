import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, LinearProgress, Alert
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useApi } from '../contexts/ApiContext';

const AuditLogs = () => {
    const theme = useTheme();
    const { auditService } = useApi();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const response = await auditService.getAll();
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data : data.logs || data.items || [];
                setLogs(items);
            } catch (err) {
                console.error('Failed to load audit logs:', err);
                setError('Failed to load audit logs.');
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [auditService]);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 4 }}>Audit Logs</Typography>

            {loading ? <LinearProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <Paper sx={{  background: alpha(theme.palette.background.paper, 0.6) }}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Timestamp</TableCell>
                                    <TableCell>User</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Details</TableCell>
                                    <TableCell>IP Address</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} align="center">No logs found</TableCell></TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : (log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell fontWeight="600">{log.user}</TableCell>
                                            <TableCell>
                                                <Chip label={log.action} size="small" variant="outlined" />
                                            </TableCell>
                                            <TableCell>{log.details}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                    {log.ip}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default AuditLogs;
