import "./DateInputHtml5.css";


function TimeInputHtml5({ labelName, value, onTimeChange, type = "datetime-local" }) {
    const formattedValue = (value) => {
        if (!value) return "";
        const date = new Date(value);
        const pad = (num) => num < 10 ? "0" + num : num;

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
    const handleChange = (e) => {
        const dateTimeString = e.target.value;
        if (dateTimeString) {
            const updatedDate = new Date(dateTimeString);
            onTimeChange(updatedDate);
        } else {
            onTimeChange(null);
        }
    };
    return (
        <div className={"date-input-card"}>
            <span className={"date-lable"}>{labelName}</span>
            <input
                className={"date-input"}
                type={type}
                step="1"
                value={formattedValue(value)}
                onChange={(e) => { handleChange(e) }}
            />
        </div>
    );
}
export default TimeInputHtml5;