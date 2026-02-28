import { differenceInMilliseconds, differenceInDays, intervalToDuration, add, sub } from 'date-fns';

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

    return isNegative ? timeString : `- ${timeString}`;
}

function DateDiff(current, dvrTime) {
    if (!current || !dvrTime) {
        return "0 days 00:00:00";
    }

    const isNegative = differenceInMilliseconds(current, dvrTime) < 0;
    const start = isNegative ? current : dvrTime;
    const end = isNegative ? dvrTime : current;

    const totalDays = differenceInDays(end, start);

    const duration = intervalToDuration({ start, end });

    const pad = (num) => String(num).padStart(2, '0');

    const hours = pad(duration.hours || 0);
    const minutes = pad(duration.minutes || 0);
    const seconds = pad(duration.seconds || 0);

    const DateString = `${totalDays} days ${hours}:${minutes}:${seconds}`;

    return isNegative ? `- ${DateString}` : DateString;
}

function calculateTargetDvrDiff(currentTime, dvrTime, targetRealTime) {
    if (!currentTime || !dvrTime || !targetRealTime) return null;

    // 1. Figure out if the DVR is behind or ahead of the current time
    const isDvrBehind = currentTime > dvrTime;

    const start = isDvrBehind ? dvrTime : currentTime;
    const end = isDvrBehind ? currentTime : dvrTime;

    // 2. Extract the exact "wall clock" differences (Ignoring DST)
    const days = differenceInDays(end, start);
    const duration = intervalToDuration({ start, end });

    // 3. Package the exact shift amount
    const shiftAmount = {
        days: days,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0
    };

    // 4. Apply the exact shift to the target date
    if (isDvrBehind) {
        // If DVR is in the past, subtract the difference from the target
        return sub(targetRealTime, shiftAmount);
    } else {
        // If DVR is somehow in the future, add the difference
        return add(targetRealTime, shiftAmount);
    }
}

function calculateTargetRealTime(currentTime, dvrTime, targetDvrTime) {
    if (!currentTime || !dvrTime || !targetDvrTime) return null;
    const isDvrBehind = currentTime > dvrTime;
    const start = isDvrBehind ? dvrTime : currentTime;
    const end = isDvrBehind ? currentTime : dvrTime;
    const days = differenceInDays(end, start);
    const duration = intervalToDuration({ start, end });
    const shiftAmount = {
        days: days,
        hours: duration.hours || 0,
        minutes: duration.minutes || 0,
        seconds: duration.seconds || 0
    };
    if (isDvrBehind) {
        return add(targetDvrTime, shiftAmount);
    } else {
        return sub(targetDvrTime, shiftAmount);
    }
}

export { TimeDiff, DateDiff, calculateTargetDvrDiff, calculateTargetRealTime };