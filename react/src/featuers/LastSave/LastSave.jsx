import { useState } from 'react';
import './LastSave.css';
import DateInput from "../DateInput/DateInput.jsx";
import { DateDiff } from "../JS/HelpFunctions.js";

function LastSave() {
    const [lastSave, setLastSave] = useState(null);
    const [lastSaveResult, setLastSaveResult] = useState("");

    const handleLastSaveChange = (newValue) => { setLastSave(newValue); };

    const calculateLastSave = () => {
        const currentTime = new Date();
        setLastSaveResult(DateDiff(currentTime, lastSave, true));
    };
    return (
        <div className="page-wrapper">
            <div className="calculator-card">
                <h1 className="card-title">Last Save Calculator</h1>

                <div className="inputs-group">
                    <DateInput
                        labelName="Last Save"
                        value={lastSave}
                        onTimeChange={handleLastSaveChange}
                        onlyDate={true}
                    />
                </div>

                <div className="buttons-group">
                    <button onClick={calculateLastSave}>Calculate Last Save</button>
                </div>

                <div className="results-group">
                    <p>
                        <strong>Last Save:</strong>{' '}
                        <span>{lastSaveResult}</span>
                    </p>
                </div>


            </div>
        </div>
    );
}

export default LastSave;