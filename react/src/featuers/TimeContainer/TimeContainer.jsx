import React, { useState } from 'react';
import './TimeContainer.css';
import TimeInput from "../TimeInput/TimeInput.jsx";
import { TimeDiff, calculateTargetDvrDiff, calculateTargetRealTime } from "../JS/HelpFunctions.js";
import { addToHistoryTime } from "../JS/HistoryFunctions.js";

function TimeContainer() {
    const [CurrentTime, setCurrentTime] = useState(null);
    const [DvrTime, setDvrTime] = useState(null);
    const [targetRealTime, setTargetRealTime] = useState(null);
    const [message, setMessage] = useState("");
    const [targetDvrTime, setTargetDvrTime] = useState(null);


    const handleCurrentTimeChange = (newValue) => { setCurrentTime(newValue); };
    const handleDvrTimeChange = (newValue) => { setDvrTime(newValue); };
    const handleTargetRealTimeChange = (newValue) => { setTargetRealTime(newValue); };
    const handleTargetDvrTimeChange = (newValue) => { setTargetDvrTime(newValue); };


    const ShowRealTimeInDvr = (currentTime, dvrTime, targetRealTime) => {
        const targetTime = calculateTargetDvrDiff(currentTime, dvrTime, targetRealTime);
        if (targetTime) {
            const newMessage = `Target DVR Time: ${targetTime.toLocaleTimeString()}`;
            setMessage(newMessage);
            addToHistoryTime({ id: Date.now(), currentTime, dvrTime, message: newMessage });
        } else {
            setMessage("Please fill in all time fields.");
        }
    }

    const getCurrentTime = () => {
        const currentTime = new Date();
        setCurrentTime(currentTime);
    }

    const ShowRealTimeFromDvr = (currentTime, dvrTime, targetRealTime) => {
        const targetTime = calculateTargetRealTime(currentTime, dvrTime, targetRealTime);
        if (targetTime) {
            const newMessage = `Target Real Time: ${targetTime.toLocaleTimeString()}`;
            setMessage(newMessage);
            addToHistoryTime({ id: Date.now(), currentTime, dvrTime, message: newMessage });
        } else {
            setMessage("Please fill in all time fields.");
        }
    }

    const timeDiffResult = TimeDiff(CurrentTime, DvrTime);
    const diffColor = timeDiffResult === "00:00:00" ? "inherit" : (timeDiffResult.includes("-") ? "red" : "green");

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
                    <TimeInput
                        labelName="Target DVR Time"
                        value={targetDvrTime}
                        onTimeChange={handleTargetDvrTimeChange}
                    />
                </div>

                <div className="buttons-group">
                    <button onClick={getCurrentTime}>Get Current Time</button>
                    <button onClick={() => ShowRealTimeInDvr(CurrentTime, DvrTime, targetRealTime)}>Calculate DVR Time</button>
                    <button onClick={() => ShowRealTimeFromDvr(CurrentTime, DvrTime, targetDvrTime)}>Calculate Real Time</button>
                </div>

                <div className="results-group">
                    <p>
                        <strong>Time Difference:</strong>{' '}
                        <span style={{ color: diffColor }}>{timeDiffResult}</span>
                    </p>
                    <p><strong>{message}</strong></p>
                </div>


            </div>
        </div>
    );
}

export default TimeContainer;