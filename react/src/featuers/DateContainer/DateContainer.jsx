import React, { useState, useEffect } from 'react';
import { DateDiff, calculateTargetDvrDiff, calculateTargetRealTime } from "../HelpFunctions.js";
import DateInput from "../DateInput/DateInput.jsx";
import { format } from 'date-fns';
import './DateContainer.css';
import LastSave from "../LastSave/LastSave.jsx";
import ScrollInput from "../scroll input/ScrollInput.jsx";

function DateContainer() {
    const [currentDate, setCurrentDate] = useState(null);
    const [dvrDate, setDvrDate] = useState(null);
    const [targetRealDate, setTargetRealDate] = useState(null);
    const [targetDvrDate, setTargetDvrDate] = useState(null);
    // Tracks which of the two target fields the user typed into last, so the
    // auto-fill effect below knows which one is the source and which one it
    // should compute and overwrite.
    const [lastEditedTarget, setLastEditedTarget] = useState(null); // 'real' | 'dvr' | null

    const handleCurrentDateChange = (newValue) => { setCurrentDate(newValue); };
    const handleDvrDateChange = (newValue) => { setDvrDate(newValue); };
    const handleTargetRealDateChange = (newValue) => {
        setTargetRealDate(newValue);
        setLastEditedTarget('real');
    };
    const handleTargetDvrDateChange = (newValue) => {
        setTargetDvrDate(newValue);
        setLastEditedTarget('dvr');
    };

    const getCurrentDate = () => {
        const currentDate = new Date();
        setCurrentDate(currentDate);
    }

    // Auto-fill the other target field whenever the source field (the one
    // the user last edited) - or the current/DVR reference times it depends
    // on - changes. Guarded by comparing timestamps so writing the computed
    // value doesn't trigger another recompute in the opposite direction.
    useEffect(() => {
        if (lastEditedTarget === 'real' && currentDate && dvrDate && targetRealDate) {
            const computed = calculateTargetDvrDiff(currentDate, dvrDate, targetRealDate);
            if (computed && (!targetDvrDate || computed.getTime() !== targetDvrDate.getTime())) {
                setTargetDvrDate(computed);
            }
        } else if (lastEditedTarget === 'dvr' && currentDate && dvrDate && targetDvrDate) {
            const computed = calculateTargetRealTime(currentDate, dvrDate, targetDvrDate);
            if (computed && (!targetRealDate || computed.getTime() !== targetRealDate.getTime())) {
                setTargetRealDate(computed);
            }
        }
    }, [currentDate, dvrDate, targetRealDate, targetDvrDate, lastEditedTarget]);

    const calcSourceCaption = !lastEditedTarget
        ? "-----"
        : (lastEditedTarget === 'real'
            ? "מבוסס על הזמן האמת שהוזן"
            : "מבוסס על זמן ה-DVR שהוזן");

    const dvrTargetDisplay = targetDvrDate ? format(targetDvrDate, "dd/MM/yyyy HH:mm:ss") : "-----";

    const timeDiffResult = DateDiff(currentDate, dvrDate);
    const diffColor = (timeDiffResult === "0 ימים\n00:00:00") ? "inherit" : (timeDiffResult.includes("-") ? "red" : "green");
    const displayResultDiff = (currentDate && dvrDate) ? timeDiffResult : "-----";

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
                            <span className="diff-message" style={{ color: diffColor }}>{displayResultDiff}</span>
                        </p>
                    </div>

                    <div className="red-line"></div>

                    <LastSave />

                    <div className="red-line"></div>

                    <div className="date-clac">
                        <h1 className="card-title">חישוב זמן אירוע</h1>
                        <p className="calc-instructions" style={{ direction: "rtl" }}>
                            הזן את זמן האירוע באחד השדות, והשדה השני יחושב אוטומטית
                        </p>
                        <div className="calc-inputs">
                            {/* <DateInput
                                labelName={"Target Real Date"}
                                value={targetRealDate}
                                onTimeChange={handleTargetRealDateChange}
                            /> */}
                            <ScrollInput
                                labelName={"זמן האירוע בזמן אמת"}
                                value={targetRealDate}
                                onTimeChange={handleTargetRealDateChange}
                            />
                            {/* <DateInput
                                labelName={"Target DVR Date"}
                                value={targetDvrDate}
                                onTimeChange={handleTargetDvrDateChange}
                            /> */}
                            <ScrollInput
                                labelName={"זמן האירוע ב-DVR"}
                                value={targetDvrDate}
                                onTimeChange={handleTargetDvrDateChange}
                            />
                        </div>

                        <div className="results-group" style={{ direction: "rtl" }}>
                            <p className="calc-source-caption">{calcSourceCaption}</p>
                            <p className="calc-dvr-target">
                                <strong>עבור לזמן הזה ב-DVR:</strong>{' '}<br />
                                {dvrTargetDisplay}
                            </p>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default DateContainer;