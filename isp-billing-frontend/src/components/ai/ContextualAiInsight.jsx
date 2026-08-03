import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import {
  AutoAwesome as AiIcon,
  TrendingUp as TrendUpIcon,
  WarningAmber as WarningIcon,
  LightbulbOutlined as IdeaIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const INSIGHT_TYPE_STYLES = {
  recommendation: {
    bg: 'rgba(221, 161, 94, 0.08)',
    border: 'rgba(221, 161, 94, 0.25)',
    color: '#BC813F',
    icon: <IdeaIcon sx={{ fontSize: 18 }} />
  },
  warning: {
    bg: 'rgba(220, 38, 38, 0.06)',
    border: 'rgba(220, 38, 38, 0.2)',
    color: '#DC2626',
    icon: <WarningIcon sx={{ fontSize: 18 }} />
  },
  trend: {
    bg: 'rgba(45, 106, 79, 0.06)',
    border: 'rgba(45, 106, 79, 0.2)',
    color: '#2D6A4F',
    icon: <TrendUpIcon sx={{ fontSize: 18 }} />
  }
};

const ContextualAiInsight = ({
  type = 'recommendation',
  title,
  insight,
  actionLabel,
  onAction,
  onDismiss
}) => {
  const style = INSIGHT_TYPE_STYLES[type] || INSIGHT_TYPE_STYLES.recommendation;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '12px',
        bgcolor: style.bg,
        border: `1px solid ${style.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        mb: 2.5,
        position: 'relative'
      }}
    >
      <Box
        sx={{
          p: 0.75,
          borderRadius: '8px',
          bgcolor: '#FFFFFF',
          color: style.color,
          display: 'flex',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}
      >
        <AiIcon sx={{ fontSize: 18 }} />
      </Box>

      <Box flex={1}>
        <Box display="flex" alignItems="center" gap={1} mb={0.25}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1C1917' }}>
            {title || 'AI Decision Support'}
          </Typography>
          <Chip
            label="Contextual AI"
            size="small"
            sx={{
              height: '18px',
              fontSize: '0.625rem',
              fontWeight: 600,
              bgcolor: 'rgba(28, 25, 23, 0.06)',
              color: '#78716C'
            }}
          />
        </Box>
        <Typography sx={{ fontSize: '0.8125rem', color: '#78716C', lineHeight: 1.45 }}>
          {insight}
        </Typography>

        {actionLabel && onAction && (
          <Typography
            onClick={onAction}
            sx={{
              display: 'inline-block',
              mt: 1,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: style.color,
              cursor: 'pointer',
              textDecoration: 'underline',
              '&:hover': { opacity: 0.85 }
            }}
          >
            {actionLabel} →
          </Typography>
        )}
      </Box>

      {onDismiss && (
        <Tooltip title="Dismiss insight">
          <IconButton size="small" onClick={onDismiss} sx={{ color: '#A8A29E', p: 0.5 }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default ContextualAiInsight;
