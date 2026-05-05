import { createContext, useState } from "react";

export const HistoryContext = createContext();

export const HistoryProvider = ({ children }) => {
    // 1. Initialize state directly from LocalStorage on first load
    const [historyTime, setHistoryTime] = useState(() => {
        const saved = localStorage.getItem("historyTime");
        return saved ? JSON.parse(saved) : [];
    });

    const [historyDate, setHistoryDate] = useState(() => {
        const saved = localStorage.getItem("historyDate");
        return saved ? JSON.parse(saved) : [];
    });

    const [selectedHistoryTime, setSelectedHistoryTime] = useState(null);
    const [selectedHistoryDate, setSelectedHistoryDate] = useState(null);

    // 2. Custom function to handle adding to time history AND local storage
    const addHistoryTimeContext = (newHistoryItem) => {
        setHistoryTime(prevHistory => {
            const newArray = [...prevHistory, newHistoryItem];
            // Immediately save to local storage to keep them in sync
            localStorage.setItem("historyTime", JSON.stringify(newArray));
            return newArray;
        });
    };

    // 3. Custom function to handle adding to date history AND local storage
    const addHistoryDateContext = (newHistoryItem) => {
        setHistoryDate(prevHistory => {
            const newArray = [...prevHistory, newHistoryItem];
            localStorage.setItem("historyDate", JSON.stringify(newArray));
            return newArray;
        });
    };

    const selectHistoryTimeContext = (historyItem) => {
        setSelectedHistoryTime(historyItem);
    };

    const selectHistoryDateContext = (historyItem) => {
        setSelectedHistoryDate(historyItem);
    };

    return (
        <HistoryContext.Provider value={{
            historyTime,
            setHistoryTime,
            historyDate,
            setHistoryDate,
            addHistoryTimeContext,
            addHistoryDateContext,
            selectedHistoryTime,
            selectedHistoryDate,
            selectHistoryTimeContext,
            selectHistoryDateContext
        }}>
            {children}
        </HistoryContext.Provider>
    );
};
