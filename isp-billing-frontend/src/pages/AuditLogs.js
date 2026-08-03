import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, LinearProgress, Alert, TablePagination
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useApi } from '../contexts/ApiContext';

const AuditLogs = () => {
    const theme = useTheme();
    const { auditService } = useApi();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

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
            <Typography variant="h3" sx={{ fontWeight: 600, mb: 4 }}>Audit Logs</Typography>

            {loading ? <LinearProgress /> : error ? <Alert severity="error">{error}</Alert> : (
                <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(28, 25, 23, 0.06)' }}>
                    <TableContainer sx={{ maxHeight: 600 }}>
                        <Table stickyHeader>
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
                                    logs
                                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                      .map((log) => (
                                        <TableRow key={log.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : (log.createdAt ? new Date(log.createdAt).toLocaleString() : 'N/A')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>{log.user}</TableCell>
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
                    <TablePagination
                        component="div"
                        count={logs.length}
                        page={page}
                        onPageChange={(e, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </Paper>
            )}
        </Box>
    );
};

export default AuditLogs;
