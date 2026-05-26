import './TimeInputHtml5.css';

function TimeInputHtml5({ labelName, value, onTimeChange }) {
    const formattedValue = (val) => {
        if (!val) return "";
        const date = new Date(val);
        const pad = (num) => num < 10 ? "0" + num : num;

        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${hours}:${minutes}:${seconds}`;
    }

    const handleChange = (e) => {
        const timeString = e.target.value; // e.g. "17:30:33"
        if (timeString) {
            const [hours, minutes, seconds] = timeString.split(':');

            // Preserve the existing date if "value" exists, otherwise use today's date
            const updatedDate = value ? new Date(value) : new Date();
            updatedDate.setHours(
                parseInt(hours, 10) || 0,
                parseInt(minutes, 10) || 0,
                parseInt(seconds, 10) || 0
            );
            onTimeChange(updatedDate);
        } else {
            onTimeChange(null); // Clear the parent state when user clicks "Clear"
        }
    };

    return (
        <div className={"time-input-card"}>
            <label className={"time-lable"}>{labelName}
                <input
                    dir="ltr"
                    className={"time-input"}
                    type="time"
                    step="1"
                    value={formattedValue(value)}
                    onChange={(e) => { handleChange(e) }}
                />
            </label>
        </div>
    );
}

export default TimeInputHtml5;