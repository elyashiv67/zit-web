import React, { useState } from 'react';
import { DateDiff, calculateTargetDvrDiff, calculateTargetRealTime } from "../HelpFunctions.js";
import DateInput from "../DateInput/DateInput.jsx";
import { format } from 'date-fns';
import './DateContainer.css';
import Lastsave from "../LastSave/LastSave.jsx";
import ScrollInput from "../scroll input/ScrollInput.jsx";

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
    const diffColor = (timeDiffResult === "0 ימים\n00:00:00") ? "inherit" : (timeDiffResult.includes("-") ? "red" : "green");


    return (
        <div className="page-wrapper">
            <div className="calculator-card">
                <h1 className="card-title">הפרש זמנים</h1>

                <div className="inputs-group">

                    <div className="date-diff">
                        <div className="date-diff-inputs">
                            {/* <DateInput
                                labelName={"DVR Date"}
                                value={dvrDate}
                                onTimeChange={handleDvrDateChange}
                            /> */}
                            <ScrollInput
                                labelName={"DVR זמן"}
                                value={dvrDate}
                                onTimeChange={handleDvrDateChange}
                            />
                            <ScrollInput
                                labelName={"זמן אמת"}
                                value={currentDate}
                                onTimeChange={handleCurrentDateChange}
                            />
                            {/* <DateInput
                                labelName={"Current Date"}
                                value={currentDate}
                                onTimeChange={handleCurrentDateChange}
                            /> */}
                        </div>
                        <div className="btn-date-diff">
                            <button onClick={getCurrentDate}>הוספת זמן נוכחי</button>
                        </div>
                        <p>
                            <strong>: הפרש זמנים</strong>{' '} <br />
                            <span className="diff-message" style={{ color: diffColor }}>{timeDiffResult}</span>
                        </p>
                    </div>

                    <div className="red-line"></div>

                    <Lastsave />

                    <div className="red-line"></div>

                    <div className="date-clac">
                        <h1 className="card-title">Calculator Date</h1>
                        <div className="calc-inputs">
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
                        </div>

                        <div className="buttons-group">
                            <button onClick={() => ShowRealTimeInDvr(currentDate, dvrDate, targetRealDate)}>Calculate DVR Date</button>
                            <button onClick={() => ShowRealTimeFromDvr(currentDate, dvrDate, targetDvrDate)}>Calculate Real Date</button>
                        </div>

                        <div className="results-group">
                            <p><strong>calculated date:</strong>{' '}
                                {message || "00:00:00"}</p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default DateContainer;