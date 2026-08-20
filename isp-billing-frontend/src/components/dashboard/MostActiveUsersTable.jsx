import React from 'react';
import {
  Box, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Chip, useTheme, alpha
} from '@mui/material';
import { DataUsage as UsageIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';
import { formatBytes } from '../../utils/helpers';

export default function MostActiveUsersTable({ users = [] }) {
  const theme = useTheme();

  return (
    <CustomCard sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                bgcolor: alpha(theme.palette.primary.main, 0.12),
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <UsageIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Most Active Users (Last 30 Days)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Top data consumers ranked by total bandwidth transferred
              </Typography>
            </Box>
          </Box>
        </Box>

        {users.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">No usage activity recorded in the last 30 days.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 340 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>Rank & User</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>Contact Phone</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Download</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Upload</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Total Usage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u, idx) => (
                  <TableRow key={u.id || idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <Chip
                          label={`#${idx + 1}`}
                          size="small"
                          color={idx < 3 ? 'primary' : 'default'}
                          sx={{ fontWeight: 600, fontSize: '10px', height: 20, minWidth: 28 }}
                        />
                        <Avatar sx={{ width: 28, height: 28, fontSize: '11px', bgcolor: theme.palette.primary.light }}>
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{u.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {u.phone || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatBytes(u.downloadBytes || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatBytes(u.uploadBytes || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary.main">
                        {u.totalGB ? `${u.totalGB} GB` : formatBytes(u.totalBytes || 0)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </CustomCard>
  );
}
