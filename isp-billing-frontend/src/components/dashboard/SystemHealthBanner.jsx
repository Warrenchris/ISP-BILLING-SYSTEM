import React from 'react';
import { Box, Typography, Chip, Button, useTheme, alpha } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Router as RouterIcon,
  Storage as QueueIcon,
  Security as SystemIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function SystemHealthBanner({ routerCount = 1, queueHealth = 'Healthy' }) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        mb: 3,
        p: 2,
        borderRadius: 2,
        background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
        border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: alpha(theme.palette.success.main, 0.15),
            color: theme.palette.success.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <HealthyIcon fontSize="small" />
        </Box>
        <Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              System Operations & Network Status: Healthy
            </Typography>
            <Chip label="v2.0 Active" size="small" color="success" sx={{ height: 20, fontSize: '10px', fontWeight: 700 }} />
          </Box>
          <Typography variant="caption" color="text.secondary">
            FreeRADIUS Gateway · BullMQ Workers ({queueHealth}) · {routerCount} MikroTik Router(s) Online
          </Typography>
        </Box>
      </Box>

      <Box display="flex" gap={1.5}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RouterIcon fontSize="small" />}
          onClick={() => navigate('/network-devices')}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
        >
          Network Devices
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<QueueIcon fontSize="small" />}
          onClick={() => navigate('/queue-health')}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
        >
          Queue Health
        </Button>
      </Box>
    </Box>
  );
}
