import React, { useState } from 'react';
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
        <>
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

            <button onClick={getCurrentTime}>Get Current Time</button>
            <button onClick={() => ShowRealTimeInDvr(CurrentTime, DvrTime, targetRealTime)}>Calculate DVR Time</button>

            <p>Time Difference: {TimeDiff(CurrentTime, DvrTime)}</p>
            <p>{message}</p>
        </>
    );
}

export default TimeContainer;