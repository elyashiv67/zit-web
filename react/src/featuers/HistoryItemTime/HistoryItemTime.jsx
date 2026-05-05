import React, { useContext } from 'react';
import './HistoryItemTime.css';
import { HistoryContext } from "../../Context/history/HistoryContext.jsx";

function HistoryItemTime({ history }) {
    const { selectHistoryTimeContext } = useContext(HistoryContext);
    const formatTime = (timeString) => {
        if (!timeString) return "N/A";
        return new Date(timeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    };

    return (
        <div
            className="history-item-time"
            style={{ cursor: 'pointer' }}
            onClick={() => selectHistoryTimeContext(history)}
        >
            <p><strong>Current Time:</strong> {formatTime(history.currentTime)}</p>
            <p><strong>DVR Time:</strong> {formatTime(history.dvrTime)}</p>
            <p><strong>Message:</strong> {history.message}</p>
        </div>
    );
}

export default HistoryItemTime;