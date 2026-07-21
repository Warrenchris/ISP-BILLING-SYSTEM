import React, { useState, useEffect, useCallback } from 'react';
import { Box, CardContent, Typography, useTheme, alpha, CircularProgress } from '@mui/material';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import CustomCard from '../common/CustomCard';
import { useApi } from '../../contexts/ApiContext';

export default function RetentionTrendChart() {
  const theme = useTheme();
  const { api } = useApi();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRetentionData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard/retention-trend');
      setData(res?.data?.data || []);
    } catch (e) {
      console.error('Failed to load retention trend:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchRetentionData();
  }, [fetchRetentionData]);

  return (
    <CustomCard sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              6-Month Retention vs Churn Rate
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Rolling monthly customer retention (%) vs subscription churn (%)
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={240}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  formatter={(val) => [`${val}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="retentionRate"
                  name="Retention Rate"
                  stroke={theme.palette.success.main}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="churnRate"
                  name="Churn Rate"
                  stroke={theme.palette.error.main}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </CustomCard>
  );
}
