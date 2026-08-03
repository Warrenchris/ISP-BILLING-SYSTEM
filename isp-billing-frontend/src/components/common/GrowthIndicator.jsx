import React from 'react';
import { Box } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

/**
 * @param {number|null|undefined} value  Growth percentage points (e.g. 12.4 or -3.2). Null/undefined/NaN/0 shows neutral dash.
 */
const GrowthIndicator = ({ value }) => {
  const n = value === null || value === undefined ? NaN : Number(value);
  if (Number.isNaN(n) || n === 0) {
    return (
      <Box
        component="span"
        sx={{
          fontSize: '0.75rem',
          fontWeight: 500,
          color: '#A8A29E',
        }}
      >
        –
      </Box>
    );
  }
  const isPositive = n > 0;
  const color = isPositive ? '#2D6A4F' : '#DC2626';
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.75,
        py: 0.25,
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 500,
        bgcolor: alpha(color, 0.08),
        color: color,
      }}
    >
      {isPositive ? (
        <TrendingUp sx={{ fontSize: 14 }} aria-hidden />
      ) : (
        <TrendingDown sx={{ fontSize: 14 }} aria-hidden />
      )}
      <span>{isPositive ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`}</span>
    </Box>
  );
};

export default GrowthIndicator;
