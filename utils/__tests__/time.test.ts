import { test, expect } from "bun:test";
import { calculateDurationSeconds, formatDuration, getLogDurationSeconds } from "@/utils/time";

// test for file utils

test('calculate duration seconds', () => {
    const startTime = new Date('2022-01-01T00:00:00.000Z');
    const endTime = new Date('2022-01-01T00:01:00.000Z');
    expect(calculateDurationSeconds(startTime, endTime)).toBe(60);
});

test('format duration', () => {
    const durationSeconds = 60;
    expect(formatDuration(durationSeconds)).toBe('0h 1m');
});

test('getLogDurationSeconds', () => {
    const log1 = { duration: 120 };
    expect(getLogDurationSeconds(log1)).toBe(120);

    const log2 = {
        start_time: '2022-01-01T00:00:00.000Z',
        end_time: '2022-01-01T00:02:00.000Z',
    };
    expect(getLogDurationSeconds(log2)).toBe(120);

    const log3 = {
        startTime: '2022-01-01T00:00:00.000Z',
        endTime: '2022-01-01T00:03:00.000Z',
    };
    expect(getLogDurationSeconds(log3)).toBe(180);
});
