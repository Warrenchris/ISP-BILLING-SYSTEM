import React from 'react';
import { Box, Typography, Button } from '@mui/material';

/**
 * @param {React.ReactNode} icon
 * @param {string} title
 * @param {string} [subtitle]
 * @param {{ label: string, onClick: () => void }} [action]
 */
const EmptyState = ({ icon, title, subtitle, action }) => {
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
            '& .MuiSvgIcon-root': { fontSize: 40 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography sx={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1C1917' }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: '0.8125rem', color: '#78716C', mt: 1, maxWidth: 360 }}>
          {subtitle}
        </Typography>
      ) : null}
      {action?.label && action?.onClick ? (
        <Button
          variant="outlined"
          color="primary"
          onClick={action.onClick}
          sx={{ mt: 3, textTransform: 'none' }}
        >
          {action.label}
        </Button>
      ) : null}
    </Box>
  );
};

export default EmptyState;
