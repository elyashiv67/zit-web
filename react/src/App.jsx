import './App.css';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// Corrected import path for the latest date-fns adapter
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import TimeContainer from "./featuers/TimeContainer/TimeContainer.jsx";

function App() {
  return (
    // Wrap your components that use date pickers with LocalizationProvider
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        <TimeContainer/>
      </>
    </LocalizationProvider>
  )
}

export default App;