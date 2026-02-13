import './App.css';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {RouterProvider} from "react-router";
import Router from "./featuers/Router/Main_R.jsx";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme } from './theme';

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
          <RouterProvider router={Router}/>
      </LocalizationProvider>
    </ThemeProvider>
  )
}

export default App;