import { useState, useEffect } from 'react';
import './LastSave.css';
// import DateInput from "../DateInput/DateInput.jsx";
import { DateDiff } from "../HelpFunctions.js";
import ScrollInput from "../scroll input/ScrollInput.jsx";

function LastSave() {
    const [lastSave, setLastSave] = useState(null);
    const [lastSaveResult, setLastSaveResult] = useState("");

    const handleLastSaveChange = (newValue) => { setLastSave(newValue); };

    useEffect(() => {
        if (lastSave) {
            const currentTime = new Date();
            setLastSaveResult(DateDiff(currentTime, lastSave, true));
        } else {
            setLastSaveResult("");
        }
    }, [lastSave]);

    return (
        <div className="lastsave-card">
            <h1 className="lastSave-title">תאריך שמירה אחרון</h1>

            <div className="inputs-lastsave">
                {/* <DateInput
                    labelName="Last Save"
                    value={lastSave}
                    onTimeChange={handleLastSaveChange}
                    onlyDate={true}
                /> */}
                <ScrollInput
                    labelName="תאריך שמירה אחרון"
                    value={lastSave}
                    type="date"
                    onTimeChange={handleLastSaveChange}
                />
            </div>

            <div className="results-group">
                <p>
                    <strong>Last Save:</strong>{' '}
                    <span>{lastSaveResult}</span>
                </p>
            </div>
        </div>
    );
}

export default LastSave;