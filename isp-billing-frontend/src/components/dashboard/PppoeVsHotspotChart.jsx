import React from 'react';
import { Box, CardContent, Typography, useTheme, alpha } from '@mui/material';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import CustomCard from '../common/CustomCard';

export default function PppoeVsHotspotChart({ data = [] }) {
  const theme = useTheme();

  return (
    <CustomCard sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight={700} color="text.primary">
              Data Usage Trend: PPPoE vs Hotspot
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Daily megabytes (MB) consumed by connection type
            </Typography>
          </Box>
        </Box>

        {data.length === 0 ? (
          <Box height={260} display="flex" alignItems="center" justifyContent="center" flexDirection="column">
            <Typography variant="body2" color="text.secondary">No connection-type usage records found in the past 14 days.</Typography>
          </Box>
        ) : (
          <Box sx={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 8,
                  }}
                  formatter={(val) => [`${val} MB`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pppoe" name="PPPoE" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                <Bar dataKey="hotspot" name="Hotspot" fill={theme.palette.secondary.main} radius={[4, 4, 0, 0]} />
                <Bar dataKey="address_list" name="Address List" fill={theme.palette.info.main} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </CustomCard>
  );
}
