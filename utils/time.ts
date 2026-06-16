// file for time-related computations

// calculate duration in seconds between two dates
export function calculateDurationSeconds(startTime: Date, endTime: Date): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / 1000);
}

// calculate duration in hours from duration in seconds
export function calculateDurationHours(durationSeconds: number): number {
    return durationSeconds / 3600;
}

// format duration in hours and minutes from duration in seconds
// used for human-readable text
export function formatDuration(durationSeconds: number): string {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
}

// get duration in seconds, using pre-calculated duration field, falling back to difference of dates if 0/undefined
export function getLogDurationSeconds(log: {
    duration?: number | null;
    start_time?: Date | string | number;
    end_time?: Date | string | number;
    startTime?: Date | string | number;
    endTime?: Date | string | number;
}): number {
    if (log.duration) {
        return log.duration;
    }
    const start = log.start_time || log.startTime;
    const end = log.end_time || log.endTime;
    if (start && end) {
        return calculateDurationSeconds(new Date(start), new Date(end));
    }
    return 0;
}