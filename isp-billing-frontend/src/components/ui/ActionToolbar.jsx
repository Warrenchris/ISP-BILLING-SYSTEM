import React from 'react';
import { Box, TextField, InputAdornment, Button, IconButton, Tooltip } from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon, Add as AddIcon } from '@mui/icons-material';

const ActionToolbar = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search records…',
  filters,
  primaryAction,
  onRefresh,
  refreshing = false,
  children
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={2}
      sx={{ mb: 3 }}
    >
      {/* Left side: Search & filters */}
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" flex={1}>
        {onSearchChange !== undefined && (
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#A8A29E', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }
            }}
            sx={{
              width: { xs: '100%', sm: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: '#FFFFFF',
                borderRadius: '10px',
              }
            }}
          />
        )}
        {filters}
        {children}
      </Box>

      {/* Right side: Actions */}
      <Box display="flex" alignItems="center" gap={1.5}>
        {onRefresh && (
          <Tooltip title="Refresh data">
            <IconButton
              onClick={onRefresh}
              disabled={refreshing}
              size="small"
              sx={{
                border: '1px solid rgba(28, 25, 23, 0.12)',
                borderRadius: '10px',
                p: 1,
                bgcolor: '#FFFFFF',
                '&:hover': { bgcolor: 'rgba(28, 25, 23, 0.04)' }
              }}
            >
              <RefreshIcon sx={{ fontSize: 18, color: '#78716C' }} />
            </IconButton>
          </Tooltip>
        )}

        {primaryAction && (
          <Button
            variant="contained"
            color="primary"
            startIcon={primaryAction.icon || <AddIcon />}
            onClick={primaryAction.onClick}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '10px',
              px: 2,
              height: '40px',
            }}
          >
            {primaryAction.label}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ActionToolbar;
