import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { NavigateNext as ChevronRight } from '@mui/icons-material';

const PageHeader = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<ChevronRight sx={{ fontSize: 14, color: '#A8A29E' }} />}
          sx={{ mb: 1.5 }}
        >
          {breadcrumbs.map((b, i) => (
            <Typography
              key={i}
              sx={{
                fontSize: '0.75rem',
                fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                color: i === breadcrumbs.length - 1 ? '#1C1917' : '#78716C',
                cursor: b.onClick ? 'pointer' : 'default',
              }}
              onClick={b.onClick}
            >
              {b.label}
            </Typography>
          ))}
        </Breadcrumbs>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              letterSpacing: '-0.02em',
              color: '#1C1917',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" sx={{ color: '#78716C', fontSize: '0.875rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {actions && (
          <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
            {actions}
          </Box>
        )}
      </Box>

      {children && <Box sx={{ mt: 3 }}>{children}</Box>}
    </Box>
  );
};

export default PageHeader;
