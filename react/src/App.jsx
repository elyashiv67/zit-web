import './App.css';
import TimeInput from "./featuers/TimeInput/TimeInput.jsx";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// Corrected import path for the date-fns v3 adapter
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3';

function App() {
  return (
    // Wrap your components that use date pickers with LocalizationProvider
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <>
        <TimeInput/>
      </>
    </LocalizationProvider>
  )
}

export default App;