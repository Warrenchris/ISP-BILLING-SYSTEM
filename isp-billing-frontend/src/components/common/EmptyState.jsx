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
        py: 4,
        px: 2,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            color: 'text.secondary',
            display: 'flex',
            '& .MuiSvgIcon-root': { fontSize: 48 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 420 }}>
          {subtitle}
        </Typography>
      ) : null}
      {action?.label && action?.onClick ? (
        <Button
          variant="outlined"
          color="primary"
          onClick={action.onClick}
          sx={{ mt: 2, textTransform: 'none' }}
        >
          {action.label}
        </Button>
      ) : null}
    </Box>
  );
};

export default EmptyState;
