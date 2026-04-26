export const getStatusChipProps = (status, theme) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('open')) {
    return {
      label: status,
      sx: {
        backgroundColor: theme.palette.custom.status.openBg,
        color: theme.palette.custom.status.open }
    };
  }
  
  if (statusLower.includes('progress') || statusLower.includes('pending')) {
    return {
      label: status,
      sx: {
        backgroundColor: theme.palette.custom.status.inProgressBg,
        color: theme.palette.custom.status.inProgress }
    };
  }
  
  if (statusLower.includes('close') || statusLower.includes('resolve') || statusLower.includes('success')) {
    return {
      label: status,
      sx: {
        backgroundColor: theme.palette.custom.status.closedBg,
        color: theme.palette.custom.status.closed }
    };
  }

  // Default fallback
  return { label: status, sx: {} };
};

export const getPriorityChipProps = (priority, theme) => {
  const priorityLower = priority?.toLowerCase() || '';
  
  let color = theme.palette.text.secondary;
  if (priorityLower === 'high') color = theme.palette.custom.priority.high;
  if (priorityLower === 'medium') color = theme.palette.custom.priority.medium;
  if (priorityLower === 'low') color = theme.palette.custom.priority.low;

  return {
    label: priority,
    sx: { color }
  };
};

export const getCategoryChipProps = (category, theme) => {
  return {
    label: category,
    sx: {
      backgroundColor: 'rgba(20, 184, 166, 0.12)', // consistent teal/muted style
      color: '#14B8A6'
    }
  };
};
