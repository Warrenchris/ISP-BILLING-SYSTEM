import React from 'react';
import { Chip, alpha } from '@mui/material';

const STATUS_CONFIG = {
  active:      { bg: 'rgba(45, 106, 79, 0.08)',   color: '#2D6A4F', label: 'Active' },
  completed:   { bg: 'rgba(45, 106, 79, 0.08)',   color: '#2D6A4F', label: 'Completed' },
  paid:        { bg: 'rgba(45, 106, 79, 0.08)',   color: '#2D6A4F', label: 'Paid' },
  resolved:    { bg: 'rgba(45, 106, 79, 0.08)',   color: '#2D6A4F', label: 'Resolved' },
  closed:      { bg: 'rgba(45, 106, 79, 0.08)',   color: '#2D6A4F', label: 'Closed' },

  pending:     { bg: 'rgba(221, 161, 94, 0.1)',   color: '#BC813F', label: 'Pending' },
  in_progress: { bg: 'rgba(221, 161, 94, 0.1)',   color: '#BC813F', label: 'In Progress' },
  warning:     { bg: 'rgba(221, 161, 94, 0.1)',   color: '#BC813F', label: 'Warning' },

  expired:     { bg: 'rgba(220, 38, 38, 0.08)',   color: '#DC2626', label: 'Expired' },
  failed:      { bg: 'rgba(220, 38, 38, 0.08)',   color: '#DC2626', label: 'Failed' },
  revoked:     { bg: 'rgba(220, 38, 38, 0.08)',   color: '#DC2626', label: 'Revoked' },
  cancelled:   { bg: 'rgba(220, 38, 38, 0.08)',   color: '#DC2626', label: 'Cancelled' },

  suspended:   { bg: 'rgba(120, 113, 108, 0.1)',  color: '#78716C', label: 'Suspended' },
  inactive:    { bg: 'rgba(120, 113, 108, 0.1)',  color: '#78716C', label: 'Inactive' },

  open:        { bg: 'rgba(37, 99, 235, 0.08)',   color: '#2563EB', label: 'Open' },
  info:        { bg: 'rgba(37, 99, 235, 0.08)',   color: '#2563EB', label: 'Info' },
};

const StatusBadge = ({ status, label, size = 'small', icon, ...props }) => {
  const key = String(status || label || '').toLowerCase().replace(/[\s-]/g, '_');
  const config = STATUS_CONFIG[key] || { bg: 'rgba(120, 113, 108, 0.1)', color: '#78716C', label: status || label || 'Unknown' };

  return (
    <Chip
      size={size}
      icon={icon}
      label={label || config.label}
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 500,
        fontSize: '0.75rem',
        borderRadius: '6px',
        height: '24px',
        border: `1px solid ${alpha(config.color, 0.2)}`,
        '& .MuiChip-icon': {
          fontSize: 14,
          color: config.color,
        },
      }}
      {...props}
    />
  );
};

export default StatusBadge;
