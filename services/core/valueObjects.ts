import { isSupportedMimeType } from "@/utils/file";
import { calculateDurationSeconds, formatDuration } from "@/utils/time";


/*
Time ranges are always valid by the time they are created. 
*/
export class TimeRange {
  readonly start: Date;
  readonly end: Date;

  constructor(start: Date, end: Date) {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new Error("Validation Error: Start time must be a valid Date");
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      throw new Error("Validation Error: End time must be a valid Date");
    }
    if (start >= end) {
      throw new Error("Validation Error: Start time must be before end time");
    }
    if (end > new Date()) {
      throw new Error("Validation Error: End time cannot be in the future.");
    }

    this.start = start;
    this.end = end;
  }

  /**
   * Calculates the duration of the time range in seconds.
   */
  get durationSeconds(): number {
    return calculateDurationSeconds(this.start, this.end);
  }

  /*
  * converts the durationSeconds to a human-readable format
  *
  */
  get durationHumanReadable(): string {
    return formatDuration(this.durationSeconds);
  }



}


export interface EvidenceData {
  fileUrl: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class Evidence {
  readonly fileUrl: string;
  readonly fileKey: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly mimeType: string;

  constructor(data: EvidenceData) {
    if (!data.fileUrl) {
      throw new Error("Validation Error: File URL is required");
    }
    try {
      new URL(data.fileUrl);
    } catch {
      throw new Error("Validation Error: File URL is invalid");
    }
    if (!data.fileKey) {
      throw new Error("Validation Error: File key is required");
    }
    if (!data.fileName) {
      throw new Error("Validation Error: File name is required");
    }
    if (typeof data.fileSize !== "number" || !Number.isInteger(data.fileSize) || data.fileSize <= 0) {
      throw new Error("Validation Error: File size must be a positive integer");
    }
    if (data.fileSize > 10 * 1024 * 1024) {
      throw new Error(`Validation Error: File ${data.fileName} exceeds max size limit of 10MB`);
    }
    if (!data.mimeType) {
      throw new Error("Validation Error: MIME type is required");
    }
    const mime = data.mimeType.toLowerCase();
    if (!isSupportedMimeType(mime)) {
      throw new Error(`Validation Error: File ${data.fileName} has unsupported type.`);
    }

    this.fileUrl = data.fileUrl;
    this.fileKey = data.fileKey;
    this.fileName = data.fileName;
    this.fileSize = data.fileSize;
    this.mimeType = data.mimeType;
  }
}
