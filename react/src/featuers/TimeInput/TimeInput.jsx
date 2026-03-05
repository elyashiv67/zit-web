import { TimeField } from '@mui/x-date-pickers/TimeField';

function TimeInput({ labelName, value, onTimeChange }) {

    return (
        <div>
            <TimeField
                ampm={false}
                label={labelName}
                format={"HH:mm:ss"}
                value={value}
                onChange={(newValue) => onTimeChange(newValue)}
                slotProps={{
                    actionBar: {
                        actions: ['today', 'cancel', 'accept']
                    }
                }}
            />
        </div>
    );
}

export default TimeInput;