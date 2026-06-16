import { test, expect } from "bun:test";
import { calculateDurationSeconds, formatDuration } from "@/utils/time";

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
