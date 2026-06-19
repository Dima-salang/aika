import { describe, test, expect } from "bun:test";
import { ExcelStrategy } from "../import-export/ExcelStrategy";
import { DetailedTimeLog } from "../core/LogService";

describe("ExcelStrategy", () => {
  const strategy = new ExcelStrategy();

  const mockLogs: DetailedTimeLog[] = [
    {
      id: "log-1",
      user_id: "user-1",
      organization_id: "org-1",
      team_id: "team-1",
      project_id: "project-1",
      start_time: new Date("2026-06-17T10:00:00.000Z"),
      end_time: new Date("2026-06-17T12:00:00.000Z"),
      title: "Test Task 1",
      description: "Description 1",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      duration: 7200,
      notion_page_id: null,
      is_public: false,
      tasks: ["task-1", "task-2"],
      evidence: [
        { file_url: "https://example.com/file1.pdf", file_name: "file1.pdf" },
        { file_url: "https://example.com/file2.png", file_name: "file2.png" }
      ]
    },
    {
      id: "log-2",
      user_id: "user-1",
      organization_id: "org-1",
      team_id: null,
      project_id: null,
      start_time: new Date("2026-06-17T13:00:00.000Z"),
      end_time: new Date("2026-06-17T14:30:00.000Z"),
      title: "Test Task 2",
      description: "Description 2",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      duration: 5400,
      notion_page_id: null,
      is_public: false,
      tasks: [],
      evidence: []
    }
  ];

  test("should export and import logs in XLSX format successfully", async () => {
    // Export to XLSX buffer
    const xlsxBuffer = await strategy.export(mockLogs, "xlsx");
    expect(xlsxBuffer).toBeInstanceOf(Buffer);

    // Import back from XLSX buffer
    const result = await strategy.import(xlsxBuffer);
    expect(result.successCount).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.logs.length).toBe(2);

    const log1 = result.logs[0];
    expect(log1.title).toBe("Test Task 1");
    expect(log1.description).toBe("Description 1");
    expect(log1.startTime.toISOString()).toBe("2026-06-17T10:00:00.000Z");
    expect(log1.endTime.toISOString()).toBe("2026-06-17T12:00:00.000Z");
    expect(log1.projectName).toBeUndefined(); // Project ID matches exported project
    expect(log1.evidenceUrls).toEqual(["https://example.com/file1.pdf", "https://example.com/file2.png"]);

    const log2 = result.logs[1];
    expect(log2.title).toBe("Test Task 2");
    expect(log2.description).toBe("Description 2");
    expect(log2.startTime.toISOString()).toBe("2026-06-17T13:00:00.000Z");
    expect(log2.endTime.toISOString()).toBe("2026-06-17T14:30:00.000Z");
    expect(log2.evidenceUrls).toBeUndefined();
  });

  test("should export and import logs in CSV format successfully", async () => {
    // Export to CSV buffer
    const csvBuffer = await strategy.export(mockLogs, "csv");
    expect(csvBuffer).toBeInstanceOf(Buffer);

    // Import back from CSV buffer
    const result = await strategy.import(csvBuffer);
    expect(result.successCount).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(result.logs.length).toBe(2);

    const log1 = result.logs[0];
    expect(log1.title).toBe("Test Task 1");
    expect(log1.description).toBe("Description 1");
    expect(log1.startTime.toISOString()).toBe("2026-06-17T10:00:00.000Z");
    expect(log1.endTime.toISOString()).toBe("2026-06-17T12:00:00.000Z");

    const log2 = result.logs[1];
    expect(log2.title).toBe("Test Task 2");
  });

  test("should report validation errors for invalid import rows", async () => {
    // Manually build a CSV with errors:
    // Row 2: valid
    // Row 3: missing title
    // Row 4: invalid end time date
    // Row 5: start time >= end time
    const csvContent = [
      "Title,Description,Start Time,End Time",
      "Valid Title,Valid Desc,2026-06-17T10:00:00.000Z,2026-06-17T11:00:00.000Z",
      ",Missing Title Desc,2026-06-17T10:00:00.000Z,2026-06-17T11:00:00.000Z",
      "Bad Date,Desc,2026-06-17T10:00:00.000Z,invalid-date",
      "Overlapping,Desc,2026-06-17T12:00:00.000Z,2026-06-17T11:00:00.000Z"
    ].join("\n");

    const buffer = Buffer.from(csvContent, "utf-8");
    const result = await strategy.import(buffer);

    expect(result.successCount).toBe(1);
    expect(result.errors.length).toBe(3);

    expect(result.errors[0].row).toBe(3);
    expect(result.errors[0].error).toContain("Missing required field: Title");

    expect(result.errors[1].row).toBe(4);
    expect(result.errors[1].error).toContain("Invalid End Time");

    expect(result.errors[2].row).toBe(5);
    expect(result.errors[2].error).toContain("Start Time must be before End Time");
  });
});
