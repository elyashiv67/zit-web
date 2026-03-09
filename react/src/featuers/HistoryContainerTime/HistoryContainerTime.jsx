import React from 'react';
import './HistoryContainerTime.css';
import HistoryItemTime from "../HistoryItemTime/HistoryItemTime.jsx";
import { getHistoryTime } from "../JS/HistoryFunctions.js";

function HistoryContainerTime() {
    const history = getHistoryTime();
    return (
        <div className="history-container">
            {history.map((historyItem, index) => (
                <HistoryItemTime key={index} history={historyItem} />
            ))}
        </div>
    );
}

export default HistoryContainerTime;