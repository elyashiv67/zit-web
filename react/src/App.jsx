import './App.css';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TimeContainer from "./featuers/TimeContainer/TimeContainer.jsx";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from './theme';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <TimeContainer/>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App;