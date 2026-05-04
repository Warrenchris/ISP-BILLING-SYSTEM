import React from 'react';
import { Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

/**
 * @param {number|null|undefined} value  Growth percentage points (e.g. 12.4 or -3.2). Null/undefined/NaN/0 shows neutral dash.
 */
const GrowthIndicator = ({ value }) => {
  const theme = useTheme();
  const n = value === null || value === undefined ? NaN : Number(value);
  if (Number.isNaN(n) || n === 0) {
    return (
      <Box
        component="span"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'text.secondary',
        }}
      >
        –
      </Box>
    );
  }
  const isPositive = n > 0;
  const main = isPositive ? theme.palette.success.main : theme.palette.error.main;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.75rem',
        fontWeight: 700,
        bgcolor: alpha(main, 0.12),
        color: isPositive ? 'success.main' : 'error.main',
      }}
    >
      {isPositive ? (
        <TrendingUp sx={{ fontSize: 16 }} aria-hidden />
      ) : (
        <TrendingDown sx={{ fontSize: 16 }} aria-hidden />
      )}
      <span>{isPositive ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`}</span>
    </Box>
  );
};

export default GrowthIndicator;
