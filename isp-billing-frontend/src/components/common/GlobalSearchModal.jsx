import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogContent, TextField, Box, Typography, List, ListItem,
  ListItemText, ListItemIcon, Chip, InputAdornment, useTheme, alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  PeopleAltOutlined as PeopleIcon,
  WifiOutlined as WifiIcon,
  ConfirmationNumberOutlined as VoucherIcon,
  SupportAgentOutlined as TicketIcon,
  DashboardOutlined as DashboardIcon,
  LayersOutlined as PlansIcon,
  ReceiptLongOutlined as InvoiceIcon,
  SettingsOutlined as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../contexts/ApiContext';

const NAVIGATION_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', category: 'Navigation', icon: DashboardIcon },
  { label: 'Users & Customers', path: '/users', category: 'Navigation', icon: PeopleIcon },
  { label: 'Subscriptions', path: '/subscriptions', category: 'Navigation', icon: WifiIcon },
  { label: 'Data Plans', path: '/data-plans', category: 'Navigation', icon: PlansIcon },
  { label: 'Network Devices / Routers', path: '/network-devices', category: 'Navigation', icon: WifiIcon },
  { label: 'Vouchers', path: '/vouchers', category: 'Navigation', icon: VoucherIcon },
  { label: 'SMS Logs', path: '/sms-logs', category: 'Navigation', icon: TicketIcon },
  { label: 'Queue Health', path: '/queue-health', category: 'Navigation', icon: SettingsIcon },
  { label: 'Invoices', path: '/invoices', category: 'Navigation', icon: InvoiceIcon },
  { label: 'Reports & Analytics', path: '/reports', category: 'Navigation', icon: DashboardIcon },
  { label: 'Settings', path: '/settings', category: 'Navigation', icon: SettingsIcon },
];

export default function GlobalSearchModal({ open, onClose }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { api } = useApi();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    setSearching(true);

    const matches = [];

    // 1. Filter Navigation items
    NAVIGATION_ITEMS.forEach(nav => {
      if (nav.label.toLowerCase().includes(q)) {
        matches.push({
          id: `nav-${nav.path}`,
          title: nav.label,
          subtitle: `Navigate to ${nav.path}`,
          category: 'Page',
          path: nav.path,
          icon: nav.icon,
        });
      }
    });

    // 2. Fetch Users and Vouchers matching search
    try {
      const [usersRes, vouchersRes] = await Promise.allSettled([
        api.get('/admin/users', { params: { search: q, limit: 5 } }),
        api.get('/vouchers', { params: { search: q, limit: 5 } })
      ]);

      if (usersRes.status === 'fulfilled') {
        const users = usersRes.value?.data?.data?.users || usersRes.value?.data?.data || [];
        users.slice(0, 4).forEach(u => {
          const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
          matches.push({
            id: `user-${u.id}`,
            title: name,
            subtitle: `${u.email} · ${u.phone || 'No phone'} (${u.role || 'customer'})`,
            category: 'User',
            path: `/users/${u.id}`,
            icon: PeopleIcon,
          });
        });
      }

      if (vouchersRes.status === 'fulfilled') {
        const vouchers = vouchersRes.value?.data?.data || [];
        vouchers.slice(0, 4).forEach(v => {
          matches.push({
            id: `voucher-${v.id}`,
            title: `Voucher: ${v.code}`,
            subtitle: `Status: ${v.status} · Batch: ${v.batchId || 'N/A'}`,
            category: 'Voucher',
            path: '/vouchers',
            icon: VoucherIcon,
          });
        });
      }
    } catch (e) {
      console.error('Global search error:', e);
    } finally {
      setSearching(false);
      setResults(matches);
    }
  }, [api]);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const handleSelect = (item) => {
    onClose();
    setQuery('');
    setResults([]);
    navigate(item.path);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        setQuery('');
        setResults([]);
        onClose();
      }}
      fullWidth
      maxWidth="sm"
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }
        }
      }}
    >
      <DialogContent sx={{ p: 2 }}>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          placeholder="Search clients, vouchers, packages, or pages... (Ctrl+K / Ctrl+F)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip label="ESC" size="small" variant="outlined" sx={{ fontSize: '10px' }} />
                </InputAdornment>
              )
            }
          }}
          sx={{ mb: 1 }}
        />

        {query.trim() === '' ? (
          <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2" gutterBottom>
              Quick Shortcuts:
            </Typography>
            <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" mt={1}>
              {NAVIGATION_ITEMS.slice(0, 5).map(nav => (
                <Chip
                  key={nav.path}
                  label={nav.label}
                  size="small"
                  onClick={() => handleSelect({ path: nav.path })}
                  clickable
                />
              ))}
            </Box>
          </Box>
        ) : searching ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">Searching...</Typography>
          </Box>
        ) : results.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">No matching results found.</Typography>
          </Box>
        ) : (
          <List dense sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((item) => {
              const IconComp = item.icon || SearchIcon;
              return (
                <ListItem
                  key={item.id}
                  button
                  onClick={() => handleSelect(item)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <IconComp color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.subtitle}
                  />
                  <Chip label={item.category} size="small" variant="outlined" sx={{ fontSize: '10px' }} />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
