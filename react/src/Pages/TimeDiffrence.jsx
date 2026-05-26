import React, { useState } from 'react';
import TimeContainer from '../featuers/TimeContainer/TimeContainer.jsx';
import DateContainer from '../featuers/DateContainer/DateContainer.jsx';
import './TimeDiffrence.css';
import LastSave from '../featuers/LastSave/LastSave.jsx';

function TimeDiffrence() {
    const [activeTab, setActiveTab] = useState('date');

    return (
        <div className="timeWrapper">
            {/* disabled the pick between tabs caus right now we just work with dates */}
            {/* <div className="toggle-container">
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
            </div> */}
            <div className="content-area">
                <div className="time-container">
                    {activeTab === 'time' ? <TimeContainer /> : <DateContainer />}
                </div>
                <span className="red-line"></span>
            </div>
        </div>
    );
}

export default TimeDiffrence;