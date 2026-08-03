import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { WifiOff as OfflineIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const NetworkStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleManualRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      setIsOnline(navigator.onLine);
      setRetrying(false);
    }, 1000);
  };

  if (isOnline) return null;

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: '#DC2626',
        color: '#FFFFFF',
        py: 1,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <OfflineIcon sx={{ fontSize: 18 }} />
        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
          Network connection lost. The app will automatically sync queued operations when connection is restored.
        </Typography>
      </Box>

      <Button
        size="small"
        variant="outlined"
        onClick={handleManualRetry}
        disabled={retrying}
        startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
        sx={{
          color: '#FFFFFF',
          borderColor: 'rgba(255,255,255,0.4)',
          textTransform: 'none',
          fontSize: '0.75rem',
          fontWeight: 500,
          '&:hover': {
            borderColor: '#FFFFFF',
            bgcolor: 'rgba(255,255,255,0.1)'
          }
        }}
      >
        {retrying ? 'Reconnecting…' : 'Check Connection'}
      </Button>
    </Box>
  );
};

export default NetworkStatusBanner;
