import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: '#FFD300',
      light: '#FFE566',
      dark: '#CCa800',
      contrastText: '#0f0f1a',
    },
    background: {
      default: '#0f0f1a',
      paper: '#1a1a2e',
      elevated: '#22223a',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b0c0',
      disabled: '#6b6b80',
    },
    success: {
      main: '#22C55E',
    },
    warning: {
      main: '#FFD300',
    },
    error: {
      main: '#EF4444',
    },
    info: {
      main: '#3B82F6',
    },
    charts: {
      blue: '#3B82F6',
      green: '#22C55E',
      orange: '#F97316',
      purple: '#A855F7',
      teal: '#14B8A6',
      pink: '#EC4899',
    },
    custom: {
      borderDefault: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.15)',
      borderBrand: 'rgba(255, 211, 0, 0.3)',
      status: {
        open: '#3B82F6',
        openBg: 'rgba(59, 130, 246, 0.12)',
        inProgress: '#FFD300',
        inProgressBg: 'rgba(255, 211, 0, 0.12)',
        closed: '#22C55E',
        closedBg: 'rgba(34, 197, 94, 0.12)',
      },
      priority: {
        high: '#EF4444',
        medium: '#FFD300',
        low: '#22C55E',
      },
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", sans-serif',
    h1: {
      fontFamily: '"Syne", "DM Sans", sans-serif',
      fontSize: '2.25rem',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Syne", "DM Sans", sans-serif',
      fontSize: '1.875rem',
      fontWeight: 700,
    },
    h3: {
      fontFamily: '"Syne", "DM Sans", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h5: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '1.125rem',
      fontWeight: 600,
    },
    h6: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '1rem',
      fontWeight: 600,
    },
    body1: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    caption: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '0.75rem',
      fontWeight: 400,
      color: '#b0b0c0', // text.secondary
    },
    button: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
    overline: {
      fontFamily: '"DM Sans", "Inter", sans-serif',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

export const theme = createTheme(getDesignTokens('dark'));

theme.components = {
  MuiCard: {
    styleOverrides: {
      root: {
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.custom.borderDefault}`,
        borderRadius: theme.spacing(2),
        padding: theme.spacing(3),
        backgroundImage: 'none',
        boxShadow: 'none',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: theme.spacing(1),
        fontFamily: '"DM Sans", "Inter", sans-serif',
        fontWeight: 600,
        textTransform: 'none',
        height: '44px',
        boxShadow: 'none',
      },
      containedPrimary: {
        background: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        '&:hover': {
          background: theme.palette.primary.main,
          boxShadow: `0 4px 15px ${theme.palette.custom.borderBrand}`,
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          background: theme.palette.background.elevated,
          borderRadius: theme.spacing(1),
          height: '44px',
          '& fieldset': {
            borderColor: theme.palette.custom.borderDefault,
          },
          '&:hover fieldset': {
            borderColor: theme.palette.custom.borderDefault,
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
          },
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        background: theme.palette.background.elevated,
        borderRadius: theme.spacing(1),
        height: '44px',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.custom.borderDefault,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.custom.borderDefault,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '6px',
        fontFamily: '"DM Sans", "Inter", sans-serif',
        fontSize: '0.75rem',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        background: theme.palette.background.elevated,
        '& th': {
          fontFamily: '"DM Sans", "Inter", sans-serif',
          fontWeight: 600,
          fontSize: '0.75rem',
          color: theme.palette.text.secondary,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.03)',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${theme.palette.custom.borderDefault}`,
        paddingTop: theme.spacing(1.5),
        paddingBottom: theme.spacing(1.5),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        fontFamily: '"DM Sans", "Inter", sans-serif',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        background: theme.palette.background.paper,
        borderRadius: theme.spacing(3),
        backgroundImage: 'none',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: theme.palette.custom.borderDefault,
      },
    },
  },
};

export default theme;
