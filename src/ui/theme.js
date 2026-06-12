import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    primary: {
      main: '#2563eb',
      dark: '#1d4ed8',
      light: '#60a5fa',
    },
    secondary: {
      main: '#7c3aed',
      dark: '#6d28d9',
      light: '#a78bfa',
    },
    success: {
      main: '#16a34a',
    },
    warning: {
      main: '#ea580c',
    },
    error: {
      main: '#dc2626',
    },
    background: {
      default: '#f4f7fb',
      paper: '#ffffff',
    },
    text: {
      primary: '#061b31',
      secondary: '#64748b',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    h6: {
      fontWeight: 600,
      color: '#061b31',
    },
    body2: {
      color: '#64748b',
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
  },
})
