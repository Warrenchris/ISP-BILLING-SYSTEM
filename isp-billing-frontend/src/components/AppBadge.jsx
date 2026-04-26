import React from 'react';
import { Chip, useTheme } from '@mui/material';
import { getStatusChipProps, getPriorityChipProps, getCategoryChipProps } from '../utils/chipProps';

const AppBadge = ({ type, value, ...props }) => {
  const theme = useTheme();

  let chipProps = { label: value, sx: {} };

  if (type === 'status') {
    chipProps = getStatusChipProps(value, theme);
  } else if (type === 'priority') {
    chipProps = getPriorityChipProps(value, theme);
  } else if (type === 'category') {
    chipProps = getCategoryChipProps(value, theme);
  }

  return (
    <Chip 
      size="small" 
      label={chipProps.label} 
      sx={chipProps.sx} 
      {...props} 
    />
  );
};

export default AppBadge;
