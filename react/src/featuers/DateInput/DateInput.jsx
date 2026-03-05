import React from 'react';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

function DateInput({ labelName, value, onTimeChange, onlyDate = false }) {
    if (onlyDate) {
        return (
            <div>
                <DatePicker
                    label={labelName}
                    value={value}
                    onChange={(newValue) => onTimeChange(newValue)}
                    format={"dd/MM/yyyy"}
                    views={["year", "month", "day"]}
                    slotProps={{
                        actionBar: {
                            actions: ['today', 'cancel', 'accept']
                        }
                    }}
                />
            </div>
        )
    }
    return (
        <div>
            <DateTimePicker
                label={labelName}
                value={value}
                onChange={(newValue) => onTimeChange(newValue)}
                format={"dd/MM/yyyy HH:mm:ss"}
                ampm={false}
                timeSteps={{ minutes: 1, seconds: 1 }}
                views={["year", "month", "day", "hours", "minutes", "seconds"]}
                slotProps={{
                    actionBar: {
                        actions: ['today', 'cancel', 'accept']
                    }
                }}
            />
        </div>
    );
}

export default DateInput;