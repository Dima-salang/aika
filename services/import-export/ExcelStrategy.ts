import { read, utils, write } from "xlsx";
import { DetailedTimeLog } from "@/services/core/LogQueryService";
import { LogImportStrategy, LogExportStrategy, ImportResult, ImportedLog } from "./types";

export class ExcelStrategy implements LogImportStrategy, LogExportStrategy {
  async import(data: Buffer | ArrayBuffer): Promise<ImportResult> {
    // sheetjs read parses both xlsx and csv automatically
    const workbook = read(data, { cellDates: true, raw: false });

    // get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("Excel file has no sheets");
    }
    const sheet = workbook.Sheets[sheetName];
    const rows = utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

    const logs: ImportedLog[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    const findValue = (row: Record<string, any>, possibleKeys: string[]): string => {
      for (const k of Object.keys(row)) {
        if (possibleKeys.includes(k.trim().toLowerCase())) {
          return String(row[k]).trim();
        }
      }
      return "";
    };

    const parseDate = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date && !isNaN(val.getTime())) {
        return val;
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d;
      }
      return null;
    };

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Row offset: 1-indexed + header row
      const row = rows[i];

      const title = findValue(row, ["title", "task title", "name"]);
      const description = findValue(row, ["description", "desc"]);
      const startTimeRaw = row["start_time"] || row["startTime"] || findValue(row, ["start time", "start", "startdate", "start date"]);
      const endTimeRaw = row["end_time"] || row["endTime"] || findValue(row, ["end time", "end", "enddate", "end date"]);
      const projectName = findValue(row, ["project name", "project", "projectname"]);
      const taskTitlesRaw = findValue(row, ["task titles", "tasks", "tasktitles"]);
      const evidenceUrlsRaw = findValue(row, ["evidence urls", "evidence", "evidenceurls", "urls"]);

      if (!title) {
        errors.push({ row: rowNum, error: "Missing required field: Title" });
        continue;
      }
      if (!description) {
        errors.push({ row: rowNum, error: "Missing required field: Description" });
        continue;
      }

      const startTime = parseDate(startTimeRaw);
      const endTime = parseDate(endTimeRaw);

      if (!startTime) {
        errors.push({ row: rowNum, error: `Invalid Start Time: ${startTimeRaw}` });
        continue;
      }
      if (!endTime) {
        errors.push({ row: rowNum, error: `Invalid End Time: ${endTimeRaw}` });
        continue;
      }
      if (startTime >= endTime) {
        errors.push({ row: rowNum, error: "Start Time must be before End Time" });
        continue;
      }

      const taskTitles = taskTitlesRaw
        ? taskTitlesRaw.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      const evidenceUrls = evidenceUrlsRaw
        ? evidenceUrlsRaw.split(",").map(u => u.trim()).filter(Boolean)
        : [];

      logs.push({
        title,
        description,
        startTime,
        endTime,
        projectName: projectName || undefined,
        taskTitles: taskTitles.length > 0 ? taskTitles : undefined,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      });
    }

    return {
      successCount: logs.length,
      errors,
      logs,
    };
  }

  async export(logs: DetailedTimeLog[], format: "xlsx" | "csv" = "xlsx"): Promise<Buffer> {
    const data = logs.map(log => {
      const evidenceUrls = Array.isArray(log.evidence)
        ? log.evidence.map((e: any) => e?.file_url || "").filter(Boolean).join(", ")
        : "";

      return {
        "Title": log.title,
        "Description": log.description,
        "Start Time": log.start_time.toISOString(),
        "End Time": log.end_time.toISOString(),
        "Duration (Seconds)": log.duration,
        "Project ID": log.project_id || "",
        "Task IDs": Array.isArray(log.tasks) ? log.tasks.join(", ") : "",
        "Evidence URLs": evidenceUrls,
      };
    });

    const worksheet = utils.json_to_sheet(data);

    if (format === "csv") {
      const csvString = utils.sheet_to_csv(worksheet);
      return Buffer.from(csvString, "utf-8");
    }

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Time Logs");
    const wopts: any = { bookType: "xlsx", type: "buffer" };
    return write(workbook, wopts);
  }
}
