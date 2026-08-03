import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { WarningAmber as WarningAmberIcon } from '@mui/icons-material';

/**
 * @param {string} message
 * @param {() => void} [onRetry]
 * @param {string} [retryLabel]
 */
const ErrorState = ({ message, onRetry, retryLabel = 'Retry' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        py: 6,
        px: 3,
      }}
    >
      <WarningAmberIcon sx={{ fontSize: 40, color: '#DC2626', mb: 2.5 }} aria-hidden />
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500, color: '#DC2626' }}>
        {message}
      </Typography>
      {typeof onRetry === 'function' ? (
        <Button
          variant="contained"
          color="primary"
          onClick={onRetry}
          sx={{ mt: 3, textTransform: 'none' }}
        >
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  );
};

export default ErrorState;
