import React from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

function DateInput({labelName , value , onTimeChange}) {
    return (
        <div>
            <DateTimePicker
                label={labelName}
                value={value}
                onChange={(newValue) => onTimeChange(newValue)}
                format={"dd/MM/yyyy HH:mm:ss"}
                ampm={false}
                timeSteps={{minutes: 1 , seconds: 1}}
                views={["year","month","day","hours","minutes" , "seconds"]}
            />
        </div>

);
}

export default DateInput;