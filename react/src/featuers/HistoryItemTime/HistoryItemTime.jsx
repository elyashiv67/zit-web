import React from 'react';
import './HistoryItemTime.css';

function HistoryItemTime({ history }) {
    const formatTime = (timeString) => {
        if (!timeString) return "N/A";
        return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    return (
        <div className="history-item-time">
            <p><strong>Current Time:</strong> {formatTime(history.currentTime)}</p>
            <p><strong>DVR Time:</strong> {formatTime(history.dvrTime)}</p>
            <p><strong>Message:</strong> {history.message}</p>
        </div>
    );
}

export default HistoryItemTime;