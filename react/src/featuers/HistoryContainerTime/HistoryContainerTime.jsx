import React, { useContext } from 'react';
import './HistoryContainerTime.css';
import HistoryItemTime from "../HistoryItemTime/HistoryItemTime.jsx";
import { HistoryContext } from "../../Context/history/HistoryContext.jsx";

function HistoryContainerTime() {
    const { historyTime, setHistoryTime } = useContext(HistoryContext);
    return (
        <div className="history-wrapper">
            {historyTime.map((historyItem) => (
                <HistoryItemTime key={historyItem.id} history={historyItem} />
            ))}
        </div>
    );
}

export default HistoryContainerTime;