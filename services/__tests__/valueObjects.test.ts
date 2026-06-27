import { describe, it, expect } from "bun:test";
import { TimeRange, Evidence } from "../core/valueObjects";

describe("TimeRange Value Object", () => {
  it("should create a valid TimeRange and calculate duration", () => {
    const start = new Date(Date.now() - 3600000); // 1 hour ago
    const end = new Date();
    const timeRange = new TimeRange(start, end);

    expect(timeRange.start).toEqual(start);
    expect(timeRange.end).toEqual(end);
    expect(timeRange.durationSeconds).toBe(3600);
  });

  it("should throw if start is after or equal to end", () => {
    const start = new Date();
    const end = new Date(start.getTime() - 1000);
    expect(() => new TimeRange(start, end)).toThrow("Validation Error: Start time must be before end time");
    expect(() => new TimeRange(start, start)).toThrow("Validation Error: Start time must be before end time");
  });

  it("should throw if end time is in the future", () => {
    const start = new Date();
    const end = new Date(Date.now() + 60000); // 1 minute in future
    expect(() => new TimeRange(start, end)).toThrow("Validation Error: End time cannot be in the future.");
  });

  it("should throw if invalid dates are provided", () => {
    expect(() => new TimeRange(new Date("invalid"), new Date())).toThrow("Validation Error: Start time must be a valid Date");
    expect(() => new TimeRange(new Date(), new Date("invalid"))).toThrow("Validation Error: End time must be a valid Date");
  });
});

describe("Evidence Value Object", () => {
  it("should create a valid Evidence object", () => {
    const data = {
      fileUrl: "https://example.com/file.pdf",
      fileKey: "some-key",
      fileName: "invoice.pdf",
      fileSize: 1024 * 1024, // 1MB
      mimeType: "application/pdf"
    };
    const evidence = new Evidence(data);

    expect(evidence.fileUrl).toBe(data.fileUrl);
    expect(evidence.fileKey).toBe(data.fileKey);
    expect(evidence.fileName).toBe(data.fileName);
    expect(evidence.fileSize).toBe(data.fileSize);
    expect(evidence.mimeType).toBe(data.mimeType);
  });

  it("should throw on missing or invalid fileUrl", () => {
    const data = {
      fileUrl: "",
      fileKey: "some-key",
      fileName: "invoice.pdf",
      fileSize: 1024 * 1024,
      mimeType: "application/pdf"
    };
    expect(() => new Evidence(data)).toThrow("Validation Error: File URL is required");
    expect(() => new Evidence({ ...data, fileUrl: "not-a-url" })).toThrow("Validation Error: File URL is invalid");
  });

  it("should throw on missing fileKey or fileName", () => {
    const data = {
      fileUrl: "https://example.com/file.pdf",
      fileKey: "",
      fileName: "invoice.pdf",
      fileSize: 1024 * 1024,
      mimeType: "application/pdf"
    };
    expect(() => new Evidence(data)).toThrow("Validation Error: File key is required");
    expect(() => new Evidence({ ...data, fileKey: "key", fileName: "" })).toThrow("Validation Error: File name is required");
  });

  it("should throw on invalid file size", () => {
    const data = {
      fileUrl: "https://example.com/file.pdf",
      fileKey: "key",
      fileName: "invoice.pdf",
      fileSize: -10,
      mimeType: "application/pdf"
    };
    expect(() => new Evidence(data)).toThrow("Validation Error: File size must be a positive integer");
    expect(() => new Evidence({ ...data, fileSize: 10.5 })).toThrow("Validation Error: File size must be a positive integer");
    expect(() => new Evidence({ ...data, fileSize: 11 * 1024 * 1024 })).toThrow("exceeds max size limit of 10MB");
  });

  it("should throw on invalid or unsupported mime type", () => {
    const data = {
      fileUrl: "https://example.com/file.pdf",
      fileKey: "key",
      fileName: "invoice.pdf",
      fileSize: 1024 * 1024,
      mimeType: ""
    };
    expect(() => new Evidence(data)).toThrow("Validation Error: MIME type is required");
    expect(() => new Evidence({ ...data, mimeType: "application/octet-stream" })).toThrow("unsupported type");
  });
});
