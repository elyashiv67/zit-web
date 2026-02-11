import { TimeField } from '@mui/x-date-pickers/TimeField';

function TimeInput({labelName}) {
    // 1. Set up state to control the time picker's value

    return (
        <div>
            <TimeField ampm={false} label={labelName} format={"HH:mm:ss"}/>
        </div>
    );
}

export default TimeInput;