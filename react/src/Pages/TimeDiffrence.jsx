import React, { useState } from 'react';
import TimeContainer from '../featuers/TimeContainer/TimeContainer.jsx';
import DateContainer from '../featuers/DateContainer/DateContainer.jsx';
import './TimeDiffrence.css';
import DateInput from '../featuers/DateInput/DateInput.jsx';
import { DateDiff } from '../featuers/HelpFunctions.js';

function TimeDiffrence() {
    const [activeTab, setActiveTab] = useState('time');
    const [lastSave, setLastSave] = useState(null);
    const [lastSaveResult, setLastSaveResult] = useState("");

    const handleLastSaveChange = (newValue) => { setLastSave(newValue); };

    const calculateLastSave = () => {
        if (!lastSave) return;
        const currentTime = new Date();
        setLastSaveResult(DateDiff(currentTime, lastSave, true));
    };
    return (
        <div className="timeWrapper">
            <div className="toggle-container">
                <button
                    className={`toggle-btn ${activeTab === 'time' ? 'active' : ''}`}
                    onClick={() => setActiveTab('time')}
                >
                    Time Diff
                </button>
                <button
                    className={`toggle-btn ${activeTab === 'date' ? 'active' : ''}`}
                    onClick={() => setActiveTab('date')}
                >
                    Date Diff
                </button>
            </div>
            <div className="content-area">
                <div className="time-container">
                    {activeTab === 'time' ? <TimeContainer /> : <DateContainer />}
                </div>


                <div className="lastSave">
                    <h1 className="lastSave-title">Last Save Calculator</h1>
                    <DateInput
                        labelName="Last Save"
                        value={lastSave}
                        onTimeChange={handleLastSaveChange}
                    />
                    <button className="lastSave-btn" onClick={calculateLastSave}>Calculate Last Save</button>

                    <p><strong>Last Save:</strong> {lastSaveResult}</p>
                </div>
            </div>
        </div>
    );
}

export default TimeDiffrence;