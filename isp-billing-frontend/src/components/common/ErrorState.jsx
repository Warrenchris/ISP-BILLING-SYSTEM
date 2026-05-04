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
        py: 4,
        px: 2,
      }}
    >
      <WarningAmberIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} aria-hidden />
      <Typography variant="subtitle1" sx={{ color: 'error.main', fontWeight: 600 }}>
        {message}
      </Typography>
      {typeof onRetry === 'function' ? (
        <Button
          variant="contained"
          color="primary"
          onClick={onRetry}
          sx={{ mt: 2, textTransform: 'none' }}
        >
          {retryLabel}
        </Button>
      ) : null}
    </Box>
  );
};

export default ErrorState;
