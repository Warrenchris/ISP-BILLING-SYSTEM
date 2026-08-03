import React from 'react';
import { Box, CardContent, Typography, Grid, Chip, useTheme, alpha } from '@mui/material';
import { WifiTethering as LiveIcon, TrendingUp as PeakIcon, Speed as AvgIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

export default function LiveUsersCard({ liveData }) {
  const theme = useTheme();
  const live = liveData?.liveNow || 0;
  const avg = liveData?.avgActive || 0;
  const peak = liveData?.weeklyPeak || 0;

  return (
    <CustomCard sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '10px',
                background: alpha(theme.palette.success.main, 0.15),
                color: theme.palette.success.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LiveIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                Active Users Right Now
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Live RADIUS accounting sessions
              </Typography>
            </Box>
          </Box>
          <Chip
            label="LIVE"
            color="success"
            size="small"
            sx={{ fontWeight: 600, fontSize: '10px', animation: 'pulse 2s infinite' }}
          />
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <Typography variant="h3" fontWeight={800} color="success.main">
              {live}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Connected right now
            </Typography>
          </Grid>
          <Grid item xs={12} sm={7}>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AvgIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">24h Average:</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700}>{avg} users</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PeakIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                  <Typography variant="caption" color="text.secondary">Weekly Peak:</Typography>
                </Box>
                <Typography variant="body2" fontWeight={700} color="primary.main">{peak} users</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </CustomCard>
  );
}
