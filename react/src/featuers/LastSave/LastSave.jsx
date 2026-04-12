import { useState } from 'react';
import './LastSave.css';
import DateInput from "../DateInput/DateInput.jsx";
import { DateDiff } from "../HelpFunctions.js";

function LastSave() {
    const [lastSave, setLastSave] = useState(null);
    const [lastSaveResult, setLastSaveResult] = useState("");

    const handleLastSaveChange = (newValue) => { setLastSave(newValue); };

    const calculateLastSave = () => {
        const currentTime = new Date();
        setLastSaveResult(DateDiff(currentTime, lastSave, true));
    };
    return (
        <div className="lastsave-card">
            <h1 className="lastSave-title">Last Save Calculator</h1>

            <div className="inputs-lastsave">
                <DateInput
                    labelName="Last Save"
                    value={lastSave}
                    onTimeChange={handleLastSaveChange}
                    onlyDate={true}
                />
            </div>

            <div className="lastSave-btn">
                <button onClick={calculateLastSave}>Calculate Last Save</button>
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