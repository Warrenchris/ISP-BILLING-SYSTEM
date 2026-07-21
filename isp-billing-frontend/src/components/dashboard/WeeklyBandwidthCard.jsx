import React from 'react';
import { Box, CardContent, Typography, Grid, LinearProgress, useTheme, alpha } from '@mui/material';
import { ArrowDownward as DownloadIcon, ArrowUpward as UploadIcon, SwapVert as TotalIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';

export default function WeeklyBandwidthCard({ data = [] }) {
  const theme = useTheme();

  const totalDl = data.reduce((acc, r) => acc + (r.downloadGB || 0), 0);
  const totalUl = data.reduce((acc, r) => acc + (r.uploadGB || 0), 0);
  const grandTotal = totalDl + totalUl;

  const dlPct = grandTotal > 0 ? Math.round((totalDl / grandTotal) * 100) : 0;
  const ulPct = grandTotal > 0 ? Math.round((totalUl / grandTotal) * 100) : 0;

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
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.12)} 0%, ${alpha(theme.palette.primary.dark, 0.12)} 100%)`,
                color: theme.palette.primary.main,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TotalIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                Weekly Network Data Usage
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total traffic over past 7 days (GB)
              </Typography>
            </Box>
          </Box>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {grandTotal.toFixed(2)} GB
          </Typography>
        </Box>

        <Grid container spacing={2} mb={2}>
          <Grid item xs={6}>
            <Box p={1.5} borderRadius={2} bgcolor={alpha(theme.palette.info.main, 0.08)} border={`1px solid ${alpha(theme.palette.info.main, 0.2)}`}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <DownloadIcon sx={{ fontSize: 16, color: 'info.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Download</Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} color="info.main">
                {totalDl.toFixed(2)} GB
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={6}>
            <Box p={1.5} borderRadius={2} bgcolor={alpha(theme.palette.secondary.main, 0.08)} border={`1px solid ${alpha(theme.palette.secondary.main, 0.2)}`}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <UploadIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Upload</Typography>
              </Box>
              <Typography variant="h5" fontWeight={800} color="secondary.main">
                {totalUl.toFixed(2)} GB
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">Download ({dlPct}%)</Typography>
            <Typography variant="caption" color="text.secondary">Upload ({ulPct}%)</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={dlPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: alpha(theme.palette.secondary.main, 0.3),
              '& .MuiLinearProgress-bar': { bgcolor: theme.palette.info.main }
            }}
          />
        </Box>
      </CardContent>
    </CustomCard>
  );
}
