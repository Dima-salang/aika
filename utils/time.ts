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