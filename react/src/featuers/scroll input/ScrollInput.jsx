import "./ScrollInput.css";


function ScrollInput({ labelName, value, onTimeChange, type = "datetime-local" }) {
    const formattedValue = (value) => {
        if (!value) return "";
        const date = new Date(value);
        const pad = (num) => num < 10 ? "0" + num : num;

        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());

        if (type === "date") {
            return `${year}-${month}-${day}`;
        }

        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());

        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }
    const handleChange = (e) => {
        const dateTimeString = e.target.value;
        if (dateTimeString) {
            let updatedDate;
            if (type === "date") {
                const [year, month, day] = dateTimeString.split('-');
                updatedDate = new Date();
                updatedDate.setFullYear(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
            } else {
                updatedDate = new Date(dateTimeString);
            }
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
export default ScrollInput;