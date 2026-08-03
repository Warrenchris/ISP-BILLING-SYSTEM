import React from 'react';
import {
  Box, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, useTheme, alpha
} from '@mui/material';
import { Layers as PlansIcon, AttachMoney as RevenueIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

export default function PackagePerformanceTable({ packages = [] }) {
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
                bgcolor: alpha(theme.palette.secondary.main, 0.12),
                color: theme.palette.secondary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <PlansIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} color="text.primary">
                Package Performance Comparison
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active subscribers, monthly revenue, average data usage, and ARPU by plan
              </Typography>
            </Box>
          </Box>
        </Box>

        {packages.length === 0 ? (
          <Box p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">No data plans configured.</Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 340 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 500 }}>Package / Plan</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Price (KES)</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Active Subscribers</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Monthly Revenue</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">Avg Usage / User</TableCell>
                  <TableCell sx={{ fontWeight: 500 }} align="right">ARPU (KES)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {pkg.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        KES {pkg.price?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${pkg.activeSubscribers} users`}
                        size="small"
                        color={pkg.activeSubscribers > 0 ? 'primary' : 'default'}
                        variant={pkg.activeSubscribers > 0 ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, fontSize: '11px' }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="success.main">
                        KES {pkg.monthlyRevenue?.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {pkg.avgDataUsageMB != null ? `${Number(pkg.avgDataUsageMB).toFixed(2)} MB` : '0 MB'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={800} color="primary.main">
                        KES {pkg.arpu?.toLocaleString()}
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
