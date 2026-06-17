import { DetailedTimeLog } from "@/services/LogService";
import { z } from "zod";

export interface ImportedLog {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  projectName?: string;
  taskTitles?: string[];
  evidenceUrls?: string[];
}


// zod schema
export const importedLogZodSchema = z.object({
  title: z.string(),
  description: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  projectName: z.string().optional(),
  taskTitles: z.array(z.string()).optional(),
  evidenceUrls: z.array(z.string()).optional(),
});
export type ImportedLogInput = z.infer<typeof importedLogZodSchema>;

export interface ImportRowError {
  row: number;
  error: string;
}

export interface ImportResult {
  successCount: number;
  errors: ImportRowError[];
  logs: ImportedLog[];
}

export interface LogImportStrategy {
  import(data: Buffer | ArrayBuffer): Promise<ImportResult>;
}

export interface LogExportStrategy {
  export(logs: DetailedTimeLog[], format?: "xlsx" | "csv"): Promise<Buffer>;
}
