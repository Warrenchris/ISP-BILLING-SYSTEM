import React from 'react';
import { Box, Typography, List, ListItem, ListItemText, Chip, Button } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import CustomCard from '../common/CustomCard';
import { useNavigate } from 'react-router-dom';

const PriorityTicketsWidget = ({ tickets = [] }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <CustomCard sx={{ mb: 4 }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorIcon sx={{ color: theme.palette.error.main }} />
          <Typography variant="h6" fontWeight={600}>
            Priority Tickets
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          size="small" 
          color="error"
          onClick={() => navigate('/support-tickets')}
          sx={{ textTransform: 'none' }}
        >
          View All
        </Button>
      </Box>

      {tickets.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No open priority tickets at this time.</Typography>
        </Box>
      ) : (
        <List sx={{ p: 0 }}>
          {tickets.map((ticket, i) => (
            <ListItem 
              key={ticket.id}
              sx={{ 
                borderBottom: i < tickets.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                py: 2, px: 3,
                '&:hover': { background: alpha(theme.palette.error.main, 0.05) }
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle2" fontWeight={600} mb={0.5} component="div">
                    {ticket.subject}
                  </Typography>
                }
                secondaryTypographyProps={{ component: 'div' }}
                secondary={
                  <Box display="flex" gap={1} alignItems="center" mt={0.5}>
                    <Chip size="small" label={ticket.priority} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main, fontWeight: 700, textTransform: 'capitalize', height: 20 }} />
                    <Chip size="small" label={ticket.status} sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'text.secondary', textTransform: 'capitalize', height: 20 }} />
                    <Typography variant="caption" color="text.secondary" ml={1} component="span">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </CustomCard>
  );
};

export default PriorityTicketsWidget;
