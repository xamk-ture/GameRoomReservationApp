import { createTheme } from "@mui/material/styles";

// Common theme options
const commonThemeOptions = {
  typography: {
    fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
          // Remove fontSize override to use Material-UI defaults
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
          fontSize: 13,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: 'Roboto, "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: { arrow: { color: '#14496a' } },
      defaultProps: {
        arrow: true,
        componentsProps: {
          tooltip: {
            sx: {
              padding: 1,
              backgroundColor: '#14496a',
              fontSize: 12,
            },
          },
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#14496a',
    },
    secondary: {
      main: '#15bf20',
    },
    success: {
      main: '#14496A',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    // Custom colors for navigation and toolbar
    custom: {
      sidebar: '#ffaa00',
      toolbar: '#ffaa00',
      sidebarText: '#000000',
      toolbarText: '#000000',
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...commonThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffaa00',
    },
    secondary: {
      main: '#15bf20',
    },
    success: {
      main: '#15bf20',
    },
    background: {
      default: '#2b2b2b',
      paper: '#3e3e3e',
    },
    // Custom colors for navigation and toolbar in dark mode
    custom: {
      sidebar: '#ffaa00',
      toolbar: '#ffaa00',
      sidebarText: '#000000',
      toolbarText: '#000000',
    },
  },
});

// Default theme (light)
export const appTheme = lightTheme;

// Type augmentation for custom palette colors
declare module '@mui/material/styles' {
  interface Palette {
    custom: {
      sidebar: string;
      toolbar: string;
      sidebarText: string;
      toolbarText: string;
    };
  }
  interface PaletteOptions {
    custom?: {
      sidebar?: string;
      toolbar?: string;
      sidebarText?: string;
      toolbarText?: string;
    };
  }
}
