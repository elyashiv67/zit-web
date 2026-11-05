import {describe, expect, it} from 'vitest';
import {
    daysSince, daysText, directionText, dvrTimeFor, formatClock, fromLocalInput,
    offsetParts, partsFromMs, realTimeFor, toLocalInput,
} from './timeMath.js';

const at = s => new Date(s);

describe('offsetParts', () => {
    it('DVR ahead of real time', () => {
        const p = offsetParts(at('2026-11-04T10:00:00'), at('2026-11-04T10:03:25'));
        expect(p).toMatchObject({direction: 'ahead', days: 0, hours: 0, minutes: 3, seconds: 25});
        expect(formatClock(p)).toBe('00:03:25');
    });

    it('DVR behind, over several days', () => {
        const p = offsetParts(at('2026-11-04T10:00:00'), at('2026-11-01T08:30:00'));
        expect(p).toMatchObject({direction: 'behind', days: 3, hours: 1, minutes: 30, seconds: 0});
    });

    it('under a second counts as synced', () => {
        expect(offsetParts(at('2026-11-04T10:00:00.000'), at('2026-11-04T10:00:00.400')).direction).toBe('synced');
    });

    it('needs both times', () => {
        expect(offsetParts(null, at('2026-11-04T10:00:00'))).toBeNull();
        expect(offsetParts(at('2026-11-04T10:00:00'), null)).toBeNull();
    });

    it('a DST change in between does not add an hour (wall-clock drift)', () => {
        // Israel leaves summer time on 2026-10-25: 24h on the wall clock is 25h in real elapsed time
        const p = offsetParts(at('2026-10-24T12:00:00'), at('2026-10-25T12:00:00'));
        expect(p).toMatchObject({direction: 'ahead', days: 1, hours: 0, minutes: 0});
    });
});

describe('event times', () => {
    const real = at('2026-11-04T10:00:00');
    const dvr = at('2026-11-04T10:03:25');

    it('real event -> where to look on the DVR', () => {
        expect(dvrTimeFor(real, dvr, at('2026-11-03T22:15:00'))).toEqual(at('2026-11-03T22:18:25'));
    });

    it('DVR timestamp -> when it really happened', () => {
        expect(realTimeFor(real, dvr, at('2026-11-03T22:18:25'))).toEqual(at('2026-11-03T22:15:00'));
    });

    it('works when the DVR is behind, and both directions round-trip', () => {
        const behind = at('2026-11-02T09:00:00');
        const event = at('2026-11-04T08:00:00');
        const onDvr = dvrTimeFor(real, behind, event);
        expect(onDvr).toEqual(at('2026-11-02T07:00:00'));
        expect(realTimeFor(real, behind, onDvr)).toEqual(event);
    });

    it('returns null until the offset is known', () => {
        expect(dvrTimeFor(null, dvr, real)).toBeNull();
        expect(realTimeFor(real, null, real)).toBeNull();
    });
});

describe('partsFromMs (history records)', () => {
    it('splits a stored offset', () => {
        const ms = -((2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000);
        expect(partsFromMs(ms)).toMatchObject({direction: 'behind', days: 2, hours: 3, minutes: 4, seconds: 5});
    });
    it('zero is synced', () => {
        expect(partsFromMs(0).direction).toBe('synced');
    });
});

describe('text helpers', () => {
    it('direction wording', () => {
        expect(directionText('ahead')).toBe('ה-DVR מקדים ב-');
        expect(directionText('behind')).toBe('ה-DVR מאחר ב-');
        expect(directionText('synced')).toBe('ה-DVR מסונכרן');
    });
    it('days wording', () => {
        expect(daysText(1)).toBe('יום אחד');
        expect(daysText(4)).toBe('4 ימים');
    });
    it('days since a date counts calendar days', () => {
        expect(daysSince(at('2026-11-01T23:00:00'), at('2026-11-04T01:00:00'))).toBe(3);
    });
});

describe('datetime-local conversion', () => {
    it('keeps seconds and local time', () => {
        const d = at('2026-11-04T10:03:25');
        expect(toLocalInput(d)).toBe('2026-11-04T10:03:25');
        expect(fromLocalInput('2026-11-04T10:03:25')).toEqual(d);
    });
    it('a plain date is local midnight, not UTC', () => {
        expect(toLocalInput(fromLocalInput('2026-11-04'), false)).toBe('2026-11-04');
        expect(fromLocalInput('2026-11-04').getHours()).toBe(0);
    });
    it('empty / broken input is null', () => {
        expect(fromLocalInput('')).toBeNull();
        expect(fromLocalInput('nope')).toBeNull();
        expect(toLocalInput(null)).toBe('');
    });
});
