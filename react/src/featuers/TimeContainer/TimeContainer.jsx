import React, { useState } from 'react';
import './TimeContainer.css';
import TimeInput from "../TimeInput/TimeInput.jsx";
import { TimeDiff, calculateTargetDvrTime } from "../HelpFunctions.js";

function TimeContainer() {
    const [CurrentTime, setCurrentTime] = useState(null);
    const [DvrTime, setDvrTime] = useState(null);
    const [targetRealTime, setTargetRealTime] = useState(null);
    const [message, setMessage] = useState("");

    const handleCurrentTimeChange = (newValue) => { setCurrentTime(newValue); };
    const handleDvrTimeChange = (newValue) => { setDvrTime(newValue); };
    const handleTargetRealTimeChange = (newValue) => { setTargetRealTime(newValue); };

    const ShowRealTimeInDvr = (currentTime, dvrTime, targetRealTime) => {
        const targetTime = calculateTargetDvrTime(currentTime, dvrTime, targetRealTime);
        if (targetTime) {
            setMessage(`Target DVR Time: ${targetTime.toLocaleTimeString()}`);
        } else {
            setMessage("Please fill in all time fields.");
        }
    }

    const getCurrentTime = () => {
        const currentTime = new Date();
        setCurrentTime(currentTime);
    }

    return (
        <div className="page-wrapper">
            <div className="calculator-card">
                <h1 className="card-title">Time Calculator</h1>
                
                <div className="inputs-group">
                    <TimeInput
                        labelName="DVR Time"
                        value={DvrTime}
                        onTimeChange={handleDvrTimeChange}
                    />
                    <TimeInput
                        labelName="Current Time"
                        value={CurrentTime}
                        onTimeChange={handleCurrentTimeChange}
                    />
                    <TimeInput
                        labelName="Target Real Time"
                        value={targetRealTime}
                        onTimeChange={handleTargetRealTimeChange}
                    />
                </div>

                <div className="buttons-group">
                    <button onClick={getCurrentTime}>Get Current Time</button>
                    <button onClick={() => ShowRealTimeInDvr(CurrentTime, DvrTime, targetRealTime)}>Calculate DVR</button>
                </div>

                <div className="results-group">
                    <p><strong>Time Difference:</strong> {TimeDiff(CurrentTime, DvrTime)}</p>
                    <p><strong>{message}</strong></p>
                </div>
            </div>
        </div>
    );
}

export default TimeContainer;