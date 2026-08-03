import React from 'react';
import { Box, Typography, Button } from '@mui/material';

/**
 * @param {React.ReactNode} icon
 * @param {string} title
 * @param {string} [subtitle]
 * @param {string} [suggestion]
 * @param {{ label: string, onClick: () => void, variant?: 'contained' | 'outlined' }} [action]
 */
const EmptyState = ({ icon, title, subtitle, suggestion, action }) => {
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
      {icon && (
        <Box
          sx={{
            mb: 2.5,
            color: '#A8A29E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: '16px',
            bgcolor: 'rgba(28, 25, 23, 0.03)',
            border: '1px solid rgba(28, 25, 23, 0.06)',
            '& .MuiSvgIcon-root': { fontSize: 32 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1C1917' }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: '0.8125rem', color: '#78716C', mt: 0.75, maxWidth: 400, lineHeight: 1.5 }}>
          {subtitle}
        </Typography>
      ) : null}
      {suggestion && (
        <Typography sx={{ fontSize: '0.75rem', color: '#A8A29E', mt: 1, maxWidth: 400, fontStyle: 'italic' }}>
          💡 Tip: {suggestion}
        </Typography>
      )}
      {action?.label && action?.onClick ? (
        <Button
          variant={action.variant || 'contained'}
          color="primary"
          onClick={action.onClick}
          sx={{
            mt: 3,
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: '10px',
            px: 2.5,
            height: '38px',
          }}
        >
          {action.label}
        </Button>
      ) : null}
    </Box>
  );
};

export default EmptyState;
