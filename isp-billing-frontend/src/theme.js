import { createTheme } from '@mui/material/styles';

const getDesignTokens = (mode) => ({
  palette: {
    mode: 'light', // Force light mode for the premium warm look
    primary: {
      main: '#DDA15E', // Warm wheat/gold tone
      light: '#F4D3B2', // Soft warm glow
      dark: '#BC813F', // Hover/Active gold
      contrastText: '#FAF7F2',
    },
    secondary: {
      main: '#2D6A4F', // Elegant green tone
      light: '#52B788',
      dark: '#1B4332',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FAF7F2', // Very light warm cream background
      paper: '#FFFFFF', // White surface
      elevated: '#F3EFE9', // Elevated light surface
    },
    text: {
      primary: '#2B2B2B', // Charcoal text
      secondary: '#5C5852', // Soft brown-gray text
      disabled: '#C5BEB5', // Disabled text
    },
    success: {
      main: '#2D6A4F',
    },
    warning: {
      main: '#DDA15E',
    },
    error: {
      main: '#EF4444',
    },
    info: {
      main: '#3B82F6',
    },
    charts: {
      blue: '#3B82F6',
      green: '#2D6A4F',
      orange: '#DDA15E',
      purple: '#8B5CF6',
      teal: '#14B8A6',
      pink: '#EC4899',
    },
    custom: {
      borderDefault: 'rgba(43, 43, 43, 0.08)',
      borderStrong: 'rgba(43, 43, 43, 0.15)',
      borderBrand: 'rgba(221, 161, 94, 0.3)',
      status: {
        open: '#3B82F6',
        openBg: 'rgba(59, 130, 246, 0.08)',
        inProgress: '#DDA15E',
        inProgressBg: 'rgba(221, 161, 94, 0.08)',
        closed: '#2D6A4F',
        closedBg: 'rgba(45, 106, 79, 0.08)',
      },
      priority: {
        high: '#EF4444',
        medium: '#DDA15E',
        low: '#2D6A4F',
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Manrope", sans-serif',
    h1: {
      fontFamily: '"Inter", "Manrope", sans-serif',
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      color: '#2B2B2B',
    },
    h2: {
      fontFamily: '"Inter", "Manrope", sans-serif',
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
      color: '#2B2B2B',
    },
    h3: {
      fontFamily: '"Inter", "Manrope", sans-serif',
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: '#2B2B2B',
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.25rem',
      fontWeight: 600,
      color: '#2B2B2B',
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.125rem',
      fontWeight: 600,
      color: '#2B2B2B',
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem',
      fontWeight: 600,
      color: '#2B2B2B',
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    caption: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem',
      fontWeight: 400,
      color: '#5C5852',
    },
    button: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
    },
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export const theme = createTheme(getDesignTokens('light'));

// Apply component-level styling overrides with standard spacings and border-radius tokens
theme.components = {
  MuiCard: {
    styleOverrides: {
      root: {
        background: theme.palette.background.paper,
        border: `1px solid ${theme.palette.custom.borderDefault}`,
        borderRadius: '18px', // Card radius standard
        padding: theme.spacing(3),
        backgroundImage: 'none',
        boxShadow: '0 4px 20px -2px rgba(43, 43, 43, 0.03)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 12px 30px -4px rgba(43, 43, 43, 0.06)',
          borderColor: theme.palette.primary.main,
        },
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: '12px', // Button radius standard
        fontFamily: '"Inter", sans-serif',
        fontWeight: 600,
        textTransform: 'none',
        height: '44px',
        boxShadow: 'none',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 'none',
        },
      },
      containedPrimary: {
        background: theme.palette.primary.main,
        color: '#FFFFFF', // Contrast text white for readability on gold
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
        borderColor: theme.palette.custom.borderDefault,
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
          background: theme.palette.background.paper,
          borderRadius: '12px', // Input radius standard
          height: '44px',
          transition: 'all 0.2s ease',
          '& fieldset': {
            borderColor: theme.palette.custom.borderDefault,
          },
          '&:hover fieldset': {
            borderColor: theme.palette.custom.borderStrong,
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.secondary.main, // green accent for focus
          },
        },
      },
    },
  },
  MuiSelect: {
    styleOverrides: {
      root: {
        background: theme.palette.background.paper,
        borderRadius: '12px', // Input radius standard
        height: '44px',
        transition: 'all 0.2s ease',
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.custom.borderDefault,
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.custom.borderStrong,
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.secondary.main,
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: '8px',
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500,
        fontSize: '0.75rem',
      },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: {
        background: theme.palette.background.elevated,
        '& th': {
          fontFamily: '"Inter", sans-serif',
          fontWeight: 600,
          fontSize: '0.75rem',
          color: theme.palette.text.secondary,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          borderBottom: `2px solid ${theme.palette.custom.borderDefault}`,
        },
      },
    },
  },
  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.2s ease',
        '&:hover': {
          background: 'rgba(43, 43, 43, 0.02)',
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
        paddingLeft: theme.spacing(2.5),
        paddingRight: theme.spacing(2.5),
        fontFamily: '"Inter", sans-serif',
        color: theme.palette.text.primary,
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        background: theme.palette.background.paper,
        borderRadius: '20px', // Dialog radius standard
        backgroundImage: 'none',
        boxShadow: '0 20px 40px -10px rgba(43, 43, 43, 0.1)',
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
  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: '12px',
        fontFamily: '"Inter", sans-serif',
        fontWeight: 500,
        fontSize: '0.875rem',
        alignItems: 'center',
        boxShadow: 'none',
      },
      standardSuccess: {
        backgroundColor: 'rgba(45, 106, 79, 0.08)',
        color: '#1B4332',
        border: '1px solid rgba(45, 106, 79, 0.25)',
        '& .MuiAlert-icon': {
          color: '#2D6A4F',
        },
      },
      standardError: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        color: '#991B1B',
        border: '1px solid rgba(239, 68, 68, 0.25)',
        '& .MuiAlert-icon': {
          color: '#EF4444',
        },
      },
      standardWarning: {
        backgroundColor: 'rgba(221, 161, 94, 0.12)',
        color: '#7C4A03',
        border: '1px solid rgba(221, 161, 94, 0.3)',
        '& .MuiAlert-icon': {
          color: '#DDA15E',
        },
      },
      standardInfo: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        color: '#1E40AF',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        '& .MuiAlert-icon': {
          color: '#3B82F6',
        },
      },
      outlinedSuccess: {
        borderColor: 'rgba(45, 106, 79, 0.3)',
        color: '#2D6A4F',
        '& .MuiAlert-icon': {
          color: '#2D6A4F',
        },
      },
      outlinedError: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        color: '#EF4444',
        '& .MuiAlert-icon': {
          color: '#EF4444',
        },
      },
      outlinedWarning: {
        borderColor: 'rgba(221, 161, 94, 0.4)',
        color: '#BC813F',
        '& .MuiAlert-icon': {
          color: '#DDA15E',
        },
      },
      outlinedInfo: {
        borderColor: 'rgba(59, 130, 246, 0.3)',
        color: '#3B82F6',
        '& .MuiAlert-icon': {
          color: '#3B82F6',
        },
      },
    },
  },
  MuiBadge: {
    styleOverrides: {
      badge: {
        fontFamily: '"Inter", sans-serif',
        fontWeight: 700,
      },
    },
  },
};

export default theme;
