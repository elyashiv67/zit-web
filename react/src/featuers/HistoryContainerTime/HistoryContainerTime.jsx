import React from 'react';
import './HistoryContainerTime.css';
import HistoryItemTime from "../HistoryItemTime/HistoryItemTime.jsx";

function HistoryContainerTime({ historyTime }) {
    return (
        <div className="history-wrapper">
            {historyTime.map((historyItem, index) => (
                <HistoryItemTime key={index} history={historyItem} />
            ))}
        </div>
    );
}

export default HistoryContainerTime;