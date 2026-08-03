import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode: 'light',
    primary: {
      main: '#DDA15E',
      light: '#F4D3B2',
      dark: '#BC813F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2D6A4F',
      light: '#52B788',
      dark: '#1B4332',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F5F4',   // Soft warm stone — the floating shell backdrop
      paper: '#FFFFFF',
      elevated: '#FAFAF9',
    },
    text: {
      primary: '#1C1917',   // Stone-900 — sharper, modern dark
      secondary: '#78716C', // Stone-500 — neutral secondary
      disabled: '#D6D3D1',
    },
    success: {
      main: '#2D6A4F',
    },
    warning: {
      main: '#DDA15E',
    },
    error: {
      main: '#DC2626',
    },
    info: {
      main: '#2563EB',
    },
    charts: {
      blue: '#2563EB',
      green: '#2D6A4F',
      orange: '#DDA15E',
      purple: '#7C3AED',
      teal: '#0D9488',
      pink: '#DB2777',
    },
    custom: {
      borderDefault: 'rgba(28, 25, 23, 0.06)',
      borderStrong: 'rgba(28, 25, 23, 0.12)',
      borderBrand: 'rgba(221, 161, 94, 0.25)',
      status: {
        open: '#2563EB',
        openBg: 'rgba(37, 99, 235, 0.06)',
        inProgress: '#DDA15E',
        inProgressBg: 'rgba(221, 161, 94, 0.06)',
        closed: '#2D6A4F',
        closedBg: 'rgba(45, 106, 79, 0.06)',
      },
      priority: {
        high: '#DC2626',
        medium: '#DDA15E',
        low: '#2D6A4F',
      },
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.025em',
      lineHeight: 1.2,
      color: '#1C1917',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.25,
      color: '#1C1917',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.015em',
      lineHeight: 1.3,
      color: '#1C1917',
    },
    h4: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.35,
      color: '#1C1917',
    },
    h5: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1C1917',
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.45,
      color: '#1C1917',
    },
    body1: {
      fontSize: '0.9375rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      color: '#78716C',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '0.01em',
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 10,
  },
});

export const theme = createTheme(getDesignTokens('light'));

// Component-level overrides
theme.components = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: '#F5F5F4',
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        background: '#FFFFFF',
        border: '1px solid rgba(28, 25, 23, 0.06)',
        borderRadius: '20px',
        padding: theme.spacing(3),
        backgroundImage: 'none',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
        transition: 'box-shadow 0.2s ease-out, border-color 0.2s ease-out',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '10px',
        fontWeight: 500,
        textTransform: 'none',
        height: '40px',
        boxShadow: 'none',
        transition: 'all 0.15s ease-out',
        fontSize: '0.8125rem',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      containedPrimary: {
        background: theme.palette.primary.main,
        color: '#FFFFFF',
        '&:hover': {
          background: theme.palette.primary.dark,
        },
      },
      containedSecondary: {
        background: theme.palette.secondary.main,
        color: '#FFFFFF',
        '&:hover': {
          background: theme.palette.secondary.dark,
        },
      },
      outlined: {
        borderColor: 'rgba(28, 25, 23, 0.12)',
        color: theme.palette.text.primary,
        '&:hover': {
          borderColor: theme.palette.primary.main,
          background: 'rgba(221, 161, 94, 0.04)',
        },
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          background: '#FFFFFF',
          borderRadius: '10px',
          transition: 'all 0.15s ease-out',
          '& fieldset': {
            borderColor: 'rgba(28, 25, 23, 0.12)',
            borderWidth: '1px',
          },
          '&:hover fieldset': {
            borderColor: 'rgba(28, 25, 23, 0.2)',
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
            borderWidth: '2px',
            boxShadow: '0 0 0 3px rgba(221, 161, 94, 0.1)',
          },
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        background: '#FFFFFF',
        borderRadius: '10px',
        transition: 'all 0.15s ease-out',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(28, 25, 23, 0.12)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(28, 25, 23, 0.2)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '6px',
        fontWeight: 500,
        fontSize: '0.75rem',
        height: '26px',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        '& th': {
          fontWeight: 500,
          fontSize: '0.75rem',
          color: theme.palette.text.secondary,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
          background: 'transparent',
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.15s ease-out',
        '&:hover': {
          background: 'rgba(28, 25, 23, 0.02)',
        },
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
        paddingTop: theme.spacing(1.75),
        paddingBottom: theme.spacing(1.75),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        fontSize: '0.8125rem',
        color: theme.palette.text.primary,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        background: '#FFFFFF',
        borderRadius: '20px',
        backgroundImage: 'none',
        boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.12)',
        border: '1px solid rgba(28, 25, 23, 0.06)',
      },
    },
  },
  MuiDivider: {
    styleOverrides: {
      root: {
        borderColor: 'rgba(28, 25, 23, 0.06)',
      },
    },
  },
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        fontWeight: 400,
        fontSize: '0.8125rem',
        alignItems: 'center',
        boxShadow: 'none',
      },
      standardSuccess: {
        backgroundColor: 'rgba(45, 106, 79, 0.06)',
        color: '#1B4332',
        border: '1px solid rgba(45, 106, 79, 0.15)',
        '& .MuiAlert-icon': { color: '#2D6A4F' },
      },
      standardError: {
        backgroundColor: 'rgba(220, 38, 38, 0.06)',
        color: '#991B1B',
        border: '1px solid rgba(220, 38, 38, 0.15)',
        '& .MuiAlert-icon': { color: '#DC2626' },
      },
      standardWarning: {
        backgroundColor: 'rgba(221, 161, 94, 0.08)',
        color: '#7C4A03',
        border: '1px solid rgba(221, 161, 94, 0.2)',
        '& .MuiAlert-icon': { color: '#DDA15E' },
      },
      standardInfo: {
        backgroundColor: 'rgba(37, 99, 235, 0.06)',
        color: '#1E40AF',
        border: '1px solid rgba(37, 99, 235, 0.15)',
        '& .MuiAlert-icon': { color: '#2563EB' },
      },
      outlinedSuccess: {
        borderColor: 'rgba(45, 106, 79, 0.2)',
        color: '#2D6A4F',
        '& .MuiAlert-icon': { color: '#2D6A4F' },
      },
      outlinedError: {
        borderColor: 'rgba(220, 38, 38, 0.2)',
        color: '#DC2626',
        '& .MuiAlert-icon': { color: '#DC2626' },
      },
      outlinedWarning: {
        borderColor: 'rgba(221, 161, 94, 0.3)',
        color: '#BC813F',
        '& .MuiAlert-icon': { color: '#DDA15E' },
      },
      outlinedInfo: {
        borderColor: 'rgba(37, 99, 235, 0.2)',
        color: '#2563EB',
        '& .MuiAlert-icon': { color: '#2563EB' },
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontWeight: 600,
        fontSize: '0.65rem',
      },
    },
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        minHeight: '40px',
      },
      indicator: {
        height: '2px',
        borderRadius: '1px',
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.8125rem',
        minHeight: '40px',
        padding: '8px 16px',
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: '4px',
        height: '4px',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiMenu: {
    styleOverrides: {
      paper: {
        borderRadius: '12px',
        border: '1px solid rgba(28, 25, 23, 0.06)',
        boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  MuiMenuItem: {
    styleOverrides: {
      root: {
        fontSize: '0.8125rem',
        borderRadius: '6px',
        margin: '2px 4px',
        padding: '8px 12px',
        '&:hover': {
          backgroundColor: 'rgba(221, 161, 94, 0.06)',
        },
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: '8px',
        fontSize: '0.75rem',
        fontWeight: 500,
        backgroundColor: '#1C1917',
        padding: '6px 12px',
      },
    },
  },
};

export default theme;
