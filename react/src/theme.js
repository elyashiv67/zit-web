import { createTheme } from '@mui/material';
import { COLORS } from './constants/colors';

// Define and export the custom theme
const darkTheme = createTheme({
  palette: {
    // Tell MUI we are in dark mode. This helps with text color inversion.
    mode: 'dark',
    primary: {
      main: COLORS.primary, // Corresponds to --primary-color
    },
    background: {
      paper: COLORS.surface,    // Corresponds to --surface-color
    },
    text: {
      primary: COLORS.text, // Corresponds to --text-color
    },
  },
  components: {
    // Override styles specifically for text fields (used by TimeField)
    MuiTextField: {
      styleOverrides: {
        root: {
          // Style for the input label
          '& label': {
            color: COLORS.text,
            opacity: 0.8,
          },
          '& label.Mui-focused': {
            color: COLORS.primary, // Use primary color when focused
            opacity: 1,
          },
          // Style for the input border
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: COLORS.border, // Corresponds to --border-color
            },
            '&:hover fieldset': {
              borderColor: COLORS.primary, // Primary color on hover
            },
            '&.Mui-focused fieldset': {
              borderColor: COLORS.primary, // Primary color when focused
            },
          },
        },
      },
    },
  },
});

const lightTheme = createTheme({
  palette: {
    // 1. Set the mode to 'light'
    mode: 'light',
    primary: {
      main: COLORS.primary, // The primary red color remains the same
    },
    background: {
      // Use a standard light color for component surfaces
      paper: '#FFFFFF',
    },
    text: {
      // Use a dark color for text to ensure contrast and readability
      primary: '#212121', // A dark grey
    },
  },
  components: {
    // Override styles for text fields for the light theme
    MuiTextField: {
      styleOverrides: {
        root: {
          // Style for the input label
          '& label': {
            color: '#555555', // A medium grey for the default label
            opacity: 0.9,
          },
          '& label.Mui-focused': {
            color: COLORS.primary, // The primary color for the focused label
            opacity: 1,
          },
          // Style for the input border
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#BDBDBD',
            },
            // Hovered border uses the primary color
            '&:hover fieldset': {
              borderColor: COLORS.primary,
            },
            // Focused border also uses the primary color
            '&.Mui-focused fieldset': {
              borderColor: COLORS.primary,
            },
          },
        },
      },
    },
  },
});

export { darkTheme, lightTheme };