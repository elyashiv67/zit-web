import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function DateInput({labelName , value , onTimeChange}) {
    return (
        <div>
            <DatePicker
                label={labelName}
                value={value}
                onChange={(newValue) => onTimeChange(newValue)}
            />
        </div>

);
}

export default DateInput;