function addToHistoryTime(newHistory) {
    const history = localStorage.getItem("historyTime");
    if (history) {
        const historyArray = JSON.parse(history);
        historyArray.push(newHistory);
        localStorage.setItem("historyTime", JSON.stringify(historyArray));
        window.dispatchEvent(new Event('historyTimeUpdated'));
    } else {
        localStorage.setItem("historyTime", JSON.stringify([newHistory]));
        window.dispatchEvent(new Event('historyTimeUpdated'));
    }
}

function getHistoryTime() {
    const history = localStorage.getItem("historyTime");
    if (history) {
        return JSON.parse(history);
    } else {
        return [];
    }
}

function clearHistoryTime() {
    localStorage.removeItem("historyTime");
}

function addToHistoryDate(newHistory) {
    const history = localStorage.getItem("historyDate");
    if (history) {
        const historyArray = JSON.parse(history);
        historyArray.push(newHistory);
        localStorage.setItem("historyDate", JSON.stringify(historyArray));
    } else {
        localStorage.setItem("historyDate", JSON.stringify([newHistory]));
    }
}

function getHistoryDate() {
    const history = localStorage.getItem("historyDate");
    if (history) {
        return JSON.parse(history);
    } else {
        return [];
    }
}

function clearHistoryDate() {
    localStorage.removeItem("historyDate");
}

export { addToHistoryTime, getHistoryTime, clearHistoryTime, addToHistoryDate, getHistoryDate, clearHistoryDate };