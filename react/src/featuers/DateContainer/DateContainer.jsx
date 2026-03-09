import React, { useState } from 'react';
import { DateDiff, calculateTargetDvrDiff, calculateTargetRealTime } from "../JS/HelpFunctions.js";
import DateInput from "../DateInput/DateInput.jsx";
import { format } from 'date-fns';
import './DateContainer.css';

function DateContainer() {
    const [currentDate, setCurrentDate] = useState(null);
    const [dvrDate, setDvrDate] = useState(null);
    const [targetRealDate, setTargetRealDate] = useState(null);
    const [message, setMessage] = useState("");
    const [targetDvrDate, setTargetDvrDate] = useState(null);

    const handleCurrentDateChange = (newValue) => { setCurrentDate(newValue); };
    const handleDvrDateChange = (newValue) => { setDvrDate(newValue); };
    const handleTargetRealDateChange = (newValue) => { setTargetRealDate(newValue); };
    const handleTargetDvrDateChange = (newValue) => { setTargetDvrDate(newValue); };

    const ShowRealTimeInDvr = (currentDate, dvrDate, targetRealDate) => {
        const targetDate = calculateTargetDvrDiff(currentDate, dvrDate, targetRealDate);
        if (targetDate) {
            setMessage(`Target DVR Time: ${format(targetDate, "dd/MM/yyyy HH:mm:ss")}`);
        } else {
            setMessage("Please fill in all time fields.");
        }
    }
    const getCurrentDate = () => {
        const currentDate = new Date();
        setCurrentDate(currentDate);
    }

    const ShowRealTimeFromDvr = (currentDate, dvrDate, targetDvrDate) => {
        const targetDate = calculateTargetRealTime(currentDate, dvrDate, targetDvrDate);
        if (targetDate) {
            setMessage(`Target Real Time: ${format(targetDate, "dd/MM/yyyy HH:mm:ss")}`);
        } else {
            setMessage("Please fill in all time fields.");
        }
    }

    const timeDiffResult = DateDiff(currentDate, dvrDate);
    const diffColor = (timeDiffResult === "0 days 00:00:00") ? "inherit" : (timeDiffResult.includes("-") ? "red" : "green");


    return (
        <div className="page-wrapper">
            <div className="calculator-card">
                <h1 className="card-title">Date Calculator</h1>
                <DateInput
                    labelName={"DVR Date"}
                    value={dvrDate}
                    onTimeChange={handleDvrDateChange}
                />

                <DateInput
                    labelName={"Current Date"}
                    value={currentDate}
                    onTimeChange={handleCurrentDateChange}
                />

                <DateInput
                    labelName={"Target Real Date"}
                    value={targetRealDate}
                    onTimeChange={handleTargetRealDateChange}
                />

                <DateInput
                    labelName={"Target DVR Date"}
                    value={targetDvrDate}
                    onTimeChange={handleTargetDvrDateChange}
                />

                <div className="buttons-group">
                    <button onClick={getCurrentDate}>Get Current Date</button>
                    <button onClick={() => ShowRealTimeFromDvr(currentDate, dvrDate, targetDvrDate)}>Calculate Real Date</button>
                    <button onClick={() => ShowRealTimeInDvr(currentDate, dvrDate, targetRealDate)}>Calculate DVR Date</button>
                </div>

                <div className="results-group">
                    <p><strong>Date Difference:</strong> <span style={{ color: diffColor }}>{timeDiffResult}</span></p>
                    <p><strong>{message}</strong></p>
                </div>
            </div>
        </div>
    );
}

export default DateContainer;