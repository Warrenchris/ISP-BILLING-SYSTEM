import React, { useState, useEffect, useCallback } from 'react';
import { Box, CardContent, Typography, ButtonGroup, Button, useTheme, alpha, CircularProgress } from '@mui/material';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import CustomCard from '../common/CustomCard';
import { useApi } from '../../contexts/ApiContext';

export default function FilterableRevenueChart() {
  const theme = useTheme();
  const { reportService } = useApi();

  const [period, setPeriod] = useState('monthly'); // 'daily', 'monthly', 'yearly'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async (selectedPeriod) => {
    try {
      setLoading(true);
      const res = await reportService.getRevenueChart({ period: selectedPeriod });
      setData(res?.data?.data || []);
    } catch (e) {
      console.error('Failed to load revenue trend chart:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [reportService]);

  useEffect(() => {
    fetchChartData(period);
  }, [period, fetchChartData]);

  return (
    <CustomCard sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Payments Trend & Revenue Stream
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Completed M-Pesa & Cash customer payment revenue (KES)
            </Typography>
          </Box>

          <ButtonGroup size="small" variant="outlined">
            <Button
              variant={period === 'daily' ? 'contained' : 'outlined'}
              onClick={() => setPeriod('daily')}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
            >
              14 Days
            </Button>
            <Button
              variant={period === 'monthly' ? 'contained' : 'outlined'}
              onClick={() => setPeriod('monthly')}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
            >
              12 Months
            </Button>
            <Button
              variant={period === 'yearly' ? 'contained' : 'outlined'}
              onClick={() => setPeriod('yearly')}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
            >
              5 Years
            </Button>
          </ButtonGroup>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={240}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  formatter={(val) => [`KES ${Number(val).toLocaleString()}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </CustomCard>
  );
}
