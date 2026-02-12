import { TimeField } from '@mui/x-date-pickers/TimeField';

function TimeInput({labelName , value , onTimeChange}) {
    // 1. Set up state to control the time picker's value

    return (
        <div>
            <TimeField
                ampm={false}
                label={labelName}
                format={"HH:mm:ss"}
                value={value}
                onChange={(newValue) => onTimeChange(newValue)}
            />
        </div>
    );
}

export default TimeInput;