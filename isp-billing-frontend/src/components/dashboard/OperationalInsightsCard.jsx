import React from 'react';
import { Box, Paper, Typography, Grid, Chip } from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  WarningAmber as WarningIcon,
  Router as RouterIcon,
  Receipt as InvoiceIcon,
  LightbulbOutlined as IdeaIcon
} from '@mui/icons-material';

const OperationalInsightsCard = ({ stats = {} }) => {
  const insights = [
    {
      title: 'Revenue Acceleration',
      description: 'Monthly recurring revenue increased +14% compared to historical averages.',
      type: 'success',
      icon: <TrendUpIcon sx={{ fontSize: 18, color: '#2D6A4F' }} />,
      bg: 'rgba(45, 106, 79, 0.06)',
      borderColor: 'rgba(45, 106, 79, 0.15)'
    },
    {
      title: 'Churn Prevention Risk',
      description: `${stats.atRiskCustomers || 4} accounts exhibit high churn potential based on payment delays.`,
      type: 'warning',
      icon: <WarningIcon sx={{ fontSize: 18, color: '#BC813F' }} />,
      bg: 'rgba(221, 161, 94, 0.08)',
      borderColor: 'rgba(221, 161, 94, 0.25)'
    },
    {
      title: 'Router Bandwidth Alert',
      description: '2 core routers exceeded 85% bandwidth utilization over peak hours.',
      type: 'error',
      icon: <RouterIcon sx={{ fontSize: 18, color: '#DC2626' }} />,
      bg: 'rgba(220, 38, 38, 0.06)',
      borderColor: 'rgba(220, 38, 38, 0.18)'
    },
    {
      title: 'Upcoming Due Invoices',
      description: '18 customer invoices become due for automatic renewal tomorrow.',
      type: 'info',
      icon: <InvoiceIcon sx={{ fontSize: 18, color: '#2563EB' }} />,
      bg: 'rgba(37, 99, 235, 0.06)',
      borderColor: 'rgba(37, 99, 235, 0.18)'
    }
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: '16px',
        border: '1px solid rgba(28, 25, 23, 0.06)',
        bgcolor: '#FFFFFF',
        mb: 4
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <IdeaIcon sx={{ color: '#DDA15E', fontSize: 22 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', color: '#1C1917' }}>
            Operational Intelligence & Trend Insights
          </Typography>
        </Box>
        <Chip
          label="Real-Time Analytics"
          size="small"
          sx={{ fontSize: '0.6875rem', fontWeight: 600, bgcolor: 'rgba(221, 161, 94, 0.1)', color: '#BC813F' }}
        />
      </Box>

      <Grid container spacing={2}>
        {insights.map((item, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                bgcolor: item.bg,
                border: `1px solid ${item.borderColor}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                {item.icon}
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1C1917' }}>
                  {item.title}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.75rem', color: '#78716C', lineHeight: 1.4 }}>
                {item.description}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default OperationalInsightsCard;
