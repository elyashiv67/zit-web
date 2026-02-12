import { intervalToDuration, differenceInMilliseconds, add } from 'date-fns';

function TimeDiff(current, dvrTime) {
    if (!current || !dvrTime) {
        return "00:00:00";
    }
    const isNegative = differenceInMilliseconds(current, dvrTime) < 0;
    const start = isNegative ? current : dvrTime;
    const end = isNegative ? dvrTime : current;
    const duration = intervalToDuration({ start, end });
    const pad = (num) => String(num).padStart(2, '0');
    const hours = pad(duration.hours || 0);
    const minutes = pad(duration.minutes || 0);
    const seconds = pad(duration.seconds || 0);
    const timeString = `${hours}:${minutes}:${seconds}`;
    return isNegative ? `- ${timeString}` : timeString;
}

function calculateTargetDvrTime(currentTime, dvrTime, targetRealTime) {
    if (!currentTime || !dvrTime || !targetRealTime) return null;

    console.log("Calculating with Current Time:", currentTime.toLocaleTimeString());
    console.log("Calculating with DVR Time:", dvrTime.toLocaleTimeString());
    // ----------------------

    const timeDifference = differenceInMilliseconds(dvrTime, currentTime);
    const targetTimeInSec = Math.round(timeDifference / 1000);

    console.log("Calculated Time Difference (ms):", targetTimeInSec);
    // ----------------------

    const targetDvrTime = add(targetRealTime, { seconds: targetTimeInSec });

    return targetDvrTime;
}

export { TimeDiff, calculateTargetDvrTime };