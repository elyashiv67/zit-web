import React, { useState } from 'react';
import TimeContainer from '../featuers/TimeContainer/TimeContainer.jsx';
import DateContainer from '../featuers/DateContainer/DateContainer.jsx';
import './TimeDiffrence.css';
import LastSave from '../featuers/LastSave/LastSave.jsx';
import HistoryContainerTime from '../featuers/HistoryContainerTime/HistoryContainerTime.jsx';

function TimeDiffrence() {
    const [activeTab, setActiveTab] = useState('time');
    const [historyOpen, setHistoryOpen] = useState(false);

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
            <button
                className="history-toggle"
                onClick={() => setHistoryOpen(!historyOpen)}
            >
                {historyOpen ? 'Close History' : 'Open History'}
            </button>
            <div className={`history-container ${historyOpen ? 'active' : ''}`}>
                <HistoryContainerTime />
            </div>
            <div className="content-area">
                <div className="time-container">
                    {activeTab === 'time' ? <TimeContainer /> : <DateContainer />}
                </div>

                <span className="red-line"></span>

                <LastSave />
            </div>
        </div>
    );
}

export default TimeDiffrence;