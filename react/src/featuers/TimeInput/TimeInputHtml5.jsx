import './TimeInputHtml5.css';

function TimeInputHtml5({ labelName, value, onTimeChange }) {
    const formattedValue = value ? new Date(value).toTimeString().split(' ')[0] : "";
    const handleChange = (e) => {
        const [hours, minutes, seconds] = e.target.value.split(':');
        const updatedDate = new Date();
        updatedDate.setHours(hours || 0, minutes || 0, seconds || 0);
        onTimeChange(updatedDate);
    };
    return (
        <div className={"time-input-card"}>
            <label className={"time-lable"}>{labelName}
                <input
                    className={"time-input"}
                    type="time"
                    step="1"
                    value={formattedValue}
                    onChange={handleChange}
                />
            </label>
        </div>
    );
}
export default TimeInputHtml5;