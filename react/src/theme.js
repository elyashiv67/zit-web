import { createTheme } from '@mui/material';

// Define and export the custom theme
 const darkTheme = createTheme({
  palette: {
    // Tell MUI we are in dark mode. This helps with text color inversion.
    mode: 'dark',
    primary: {
      main: '#D54845', // Corresponds to --primary-color
    },
    background: {
      paper: '#3E4D53',    // Corresponds to --surface-color
    },
    text: {
      primary: '#F5F6F6', // Corresponds to --text-color
    },
  },
  components: {
    // Override styles specifically for text fields (used by TimeField)
    MuiTextField: {
      styleOverrides: {
        root: {
          // Style for the input label
          '& label': {
            color: '#F5F6F6',
            opacity: 0.8,
          },
          '& label.Mui-focused': {
            color: '#D54845', // Use primary color when focused
            opacity: 1,
          },
          // Style for the input border
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#704A42', // Corresponds to --border-color
            },
            '&:hover fieldset': {
              borderColor: '#D54845', // Primary color on hover
            },
            '&.Mui-focused fieldset': {
              borderColor: '#D54845', // Primary color when focused
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
      main: '#D54845', // The primary red color remains the same
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
            color: '#D54845', // The primary color for the focused label
            opacity: 1,
          },
          // Style for the input border
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#BDBDBD',
            },
            // Hovered border uses the primary color
            '&:hover fieldset': {
              borderColor: '#D54845',
            },
            // Focused border also uses the primary color
            '&.Mui-focused fieldset': {
              borderColor: '#D54845',
            },
          },
        },
      },
    },
  },
});

 export {darkTheme , lightTheme};