import React from 'react';
import './HistoryItemTime.css';

function HistoryItemTime({ history }) {
    return (
        <div className="history-item-time">
            <p><strong>Current Time:</strong> {history.currentTime}</p>
            <p><strong>DVR Time:</strong> {history.dvrTime}</p>
            <p><strong>Message:</strong> {history.message}</p>
        </div>
    );
}

export default HistoryItemTime;