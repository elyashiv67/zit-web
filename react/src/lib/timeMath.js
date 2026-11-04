import {add, differenceInCalendarDays, differenceInDays, format, intervalToDuration, sub} from 'date-fns';

// The DVR's clock drift is measured as wall-clock time (days + h:m:s), not raw milliseconds,
// so a DST change between the two times doesn't shift the result by an hour.
function shiftBetween(realTime, dvrTime) {
    const dvrBehind = realTime > dvrTime;
    const start = dvrBehind ? dvrTime : realTime;
    const end = dvrBehind ? realTime : dvrTime;
    const duration = intervalToDuration({start, end});
    return {
        dvrBehind,
        shift: {
            days: differenceInDays(end, start),
            hours: duration.hours || 0,
            minutes: duration.minutes || 0,
            seconds: duration.seconds || 0,
        },
    };
}

// direction: 'ahead' (DVR shows a later time than reality), 'behind', or 'synced'
export function offsetParts(realTime, dvrTime) {
    if (!realTime || !dvrTime) return null;
    const ms = dvrTime.getTime() - realTime.getTime();
    const {dvrBehind, shift} = shiftBetween(realTime, dvrTime);
    const direction = Math.abs(ms) < 1000 ? 'synced' : (dvrBehind ? 'behind' : 'ahead');
    return {direction, ms, ...shift};
}

// for history records, which store offset_ms = dvr - real
export function partsFromMs(ms) {
    const abs = Math.abs(ms);
    const totalSeconds = Math.floor(abs / 1000);
    return {
        direction: abs < 1000 ? 'synced' : (ms < 0 ? 'behind' : 'ahead'),
        ms,
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor(totalSeconds / 3600) % 24,
        minutes: Math.floor(totalSeconds / 60) % 60,
        seconds: totalSeconds % 60,
    };
}

const pad = n => String(n).padStart(2, '0');

export function formatClock({hours, minutes, seconds}) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function directionText(direction) {
    if (direction === 'ahead') return 'ה-DVR מקדים ב-';
    if (direction === 'behind') return 'ה-DVR מאחר ב-';
    return 'ה-DVR מסונכרן';
}

export function daysText(days) {
    if (days === 1) return 'יום אחד';
    return `${days} ימים`;
}

// an event seen at `eventReal` in reality appears at this time on the DVR
export function dvrTimeFor(realTime, dvrTime, eventReal) {
    if (!realTime || !dvrTime || !eventReal) return null;
    const {dvrBehind, shift} = shiftBetween(realTime, dvrTime);
    return dvrBehind ? sub(eventReal, shift) : add(eventReal, shift);
}

// an event seen at `eventDvr` on the DVR happened at this real time
export function realTimeFor(realTime, dvrTime, eventDvr) {
    if (!realTime || !dvrTime || !eventDvr) return null;
    const {dvrBehind, shift} = shiftBetween(realTime, dvrTime);
    return dvrBehind ? add(eventDvr, shift) : sub(eventDvr, shift);
}

export function daysSince(date, now = new Date()) {
    return differenceInCalendarDays(now, date);
}

export function formatDateTime(date) {
    return format(date, 'dd/MM/yyyy HH:mm:ss');
}

export function formatDate(date) {
    return format(date, 'dd/MM/yyyy');
}

// <input type="datetime-local" step="1"> works in local time without a timezone
export function toLocalInput(date, withTime = true) {
    if (!date) return '';
    return format(date, withTime ? "yyyy-MM-dd'T'HH:mm:ss" : 'yyyy-MM-dd');
}

export function fromLocalInput(value) {
    if (!value) return null;
    // "2026-11-04" alone would be parsed as UTC midnight; as local midnight it matches what the user picked
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}
