import { db, DBInstance, runTransaction } from "@/db";
import { calculateDurationSeconds } from "@/utils/time";
import { TimeLogObserver } from "./TimeLogObserver";
import { TimeRange, Evidence } from "./valueObjects";
import {
  NewTimeLog,
  newTimeLogZodSchema,
  CreateLogInput,
  UpdateLogInput,
  createLogInputZodSchema,
  updateLogInputZodSchema,
  TimeLog,
  TimeLogSqlite,
  evidenceInputSchema
} from "@/db/schema";
import { eq, and, lt, gt, isNull, ne, inArray, or, like } from "drizzle-orm";
import { AuditService } from "./AuditService";
import { StorageService } from "../integrations/StorageService";
import { TaskService } from "./TaskService";
import { tables } from "../../db/tables";
import crypto from "crypto";
import { z } from "zod";
import { ImportedLogInput } from "../import-export/types";

export const bulkLogItemSchema = createLogInputZodSchema
  .omit({ organizationId: true, teamId: true, userId: true })
  .extend({
    evidence: z.array(evidenceInputSchema),
  });

export type BulkLogItemInput = z.infer<typeof bulkLogItemSchema>;

export class LogService {
  private auditService: AuditService;
  private taskService: TaskService;
  private storageService: StorageService;
  private observers: TimeLogObserver[];

  constructor(
    auditService: AuditService,
    taskService: TaskService,
    storageService: StorageService,
    observers: TimeLogObserver[] = []
  ) {
    this.auditService = auditService;
    this.taskService = taskService;
    this.storageService = storageService;
    this.observers = observers;
  }

  private async notifyObservers(
    action: "create" | "update" | "delete",
    logId: string,
    userId: string,
    updatedFields?: string[],
    tx?: DBInstance
  ): Promise<void> {
    for (const observer of this.observers) {
      try {
        if (action === "create") {
          await observer.onLogCreated(logId, userId, tx);
        } else if (action === "update") {
          await observer.onLogUpdated(logId, userId, updatedFields, tx);
        } else if (action === "delete") {
          await observer.onLogDeleted(logId, userId, tx);
        }
      } catch (err) {
        console.error(`Observer error for action ${action} on log ${logId}:`, err);
      }
    }
  }

  /**
   * Helper to perform overlap validation
   * Users cannot log overlapping time logs
   */
  private async checkOverlap(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeLogId?: string,
    tx: DBInstance = db
  ): Promise<boolean> {
    z.string().parse(userId);
    z.string().optional().parse(excludeLogId);

    const timeRange = new TimeRange(startTime, endTime);

    const table = tables.timeLogs;
    const conditions = [
      eq(table.user_id, userId),
      isNull(table.deleted_at),
      lt(table.start_time, timeRange.end),
      gt(table.end_time, timeRange.start),
    ];
    if (excludeLogId) {
      conditions.push(ne(table.id, excludeLogId));
    }
    const overlapping = await tx
      .select({ id: table.id })
      .from(table)
      .where(and(...conditions))
      .limit(1);
    return overlapping.length > 0;
  }

  /**
   * Creates a new time log, validating logic overlaps, tasks existence, and evidence limits.
   * 
   * @throws {Error} If time log overlaps, task links are invalid, or evidence limits are exceeded.
   */
  async createLog(
    input: CreateLogInput,
    ipAddress?: string,
    userAgent?: string,
    outerTx?: DBInstance
  ): Promise<TimeLog | TimeLogSqlite> {
    const parsedInput = createLogInputZodSchema.parse(input);
    z.string().optional().parse(ipAddress);
    z.string().optional().parse(userAgent);

    const timeRange = new TimeRange(parsedInput.startTime, parsedInput.endTime);
    const validatedEvidence = (parsedInput.evidence || []).map((file) => new Evidence(file));

    let successfulLogId: string | null = null;

    const execute = async (tx: DBInstance) => {
      // Verify tasks exist
      if (parsedInput.taskIds && parsedInput.taskIds.length > 0) {
        const existingTasks = await this.taskService.getTasksByIds(parsedInput.taskIds, tx);
        if (existingTasks.length !== parsedInput.taskIds.length) {
          const existingIds = new Set(existingTasks.map((t) => t.id));
          for (const taskId of parsedInput.taskIds) {
            if (!existingIds.has(taskId)) {
              throw new Error(`Validation Error: Task with ID ${taskId} does not exist or is deleted`);
            }
          }
        }
      }

      // Verify project exists
      if (parsedInput.projectId && parsedInput.projectId.trim() !== "") {
        const [existingProject] = await tx
          .select({ id: tables.projects.id })
          .from(tables.projects)
          .where(and(eq(tables.projects.id, parsedInput.projectId), isNull(tables.projects.deleted_at)))
          .limit(1);
        if (!existingProject) {
          throw new Error(`Validation Error: Project with ID ${parsedInput.projectId} does not exist or is deleted`);
        }
      }

      // Overlap check
      const overlaps = await this.checkOverlap(parsedInput.userId, timeRange.start, timeRange.end, undefined, tx);
      if (overlaps) {
        throw new Error("Validation Error: Time log overlaps with an existing active log");
      }

      const logId = crypto.randomUUID();

      const logData: NewTimeLog = {
        id: logId,
        user_id: parsedInput.userId,
        organization_id: parsedInput.organizationId,
        team_id: parsedInput.teamId || null,
        project_id: parsedInput.projectId || null,
        start_time: timeRange.start,
        end_time: timeRange.end,
        title: parsedInput.title || "Untitled Task",
        description: parsedInput.description,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        duration: timeRange.durationSeconds,
        is_public: parsedInput.isPublic || false,
      };

      const validatedLog = newTimeLogZodSchema.parse(logData) as NewTimeLog;

      const [insertedLog] = await tx.insert(tables.timeLogs).values(validatedLog).returning();
      successfulLogId = insertedLog.id;

      // Insert tasks join entries
      if (parsedInput.taskIds && parsedInput.taskIds.length > 0) {
        const taskLinks = parsedInput.taskIds.map((taskId) => ({
          time_log_id: logId,
          task_id: taskId,
        }));
        await tx.insert(tables.timeLogTasks).values(taskLinks);
      }

      // Insert Document Evidence entries
      const evidenceEntries = validatedEvidence.map((file) => ({
        id: crypto.randomUUID(),
        time_log_id: logId,
        file_url: file.fileUrl,
        file_key: file.fileKey,
        file_name: file.fileName,
        file_size: file.fileSize,
        mime_type: file.mimeType,
        created_at: new Date(),
        deleted_at: null,
      }));
      if (evidenceEntries.length > 0) {
        await tx.insert(tables.documentEvidences).values(evidenceEntries);
      }

      // Record Audit Log
      await this.auditService.createAuditLog(
        parsedInput.userId,
        "time_log_creation",
        "time_logs",
        logId,
        `Created time log for duration ${timeRange.durationSeconds}s`,
        { description: parsedInput.description, taskIds: parsedInput.taskIds },
        ipAddress,
        userAgent,
        tx
      );
      return insertedLog;
    };

    const returnedLog = outerTx ?
      await execute(outerTx) :
      await runTransaction(execute);

    await this.notifyObservers("create", successfulLogId!, parsedInput.userId);

    return returnedLog;
  }

  /**
   * Updates an existing time log, verifying ownership and recalculating duration.
   * 
   * @throws {Error} If log is not found, unauthorized, overlaps, or contains invalid links.
   */
  async updateLog(
    logId: string,
    userId: string,
    input: UpdateLogInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TimeLog | TimeLogSqlite> {
    z.string().parse(logId);
    z.string().parse(userId);
    const parsedInput = updateLogInputZodSchema.parse(input);

    let filesToDelete: string[] = [];

    const execute = async (tx: DBInstance) => {
      const existing = await tx
        .select()
        .from(tables.timeLogs)
        .where(and(eq(tables.timeLogs.id, logId), isNull(tables.timeLogs.deleted_at)))
        .limit(1)
        .then(rows => rows[0]);
      if (!existing) {
        throw new Error(`Validation Error: Time log with ID ${logId} not found`);
      }

      if (existing.user_id !== userId) {
        throw new Error("Security Error: Unauthorized to modify this time log");
      }

      const startTime = parsedInput.startTime ?? existing.start_time;
      const endTime = parsedInput.endTime ?? existing.end_time;
      const timeRange = new TimeRange(startTime, endTime);

      const validatedEvidence = parsedInput.evidence
        ? parsedInput.evidence.map((file) => new Evidence(file))
        : undefined;

      // Verify tasks exist
      if (parsedInput.taskIds && parsedInput.taskIds.length > 0) {
        const existingTasks = await this.taskService.getTasksByIds(parsedInput.taskIds, tx);
        if (existingTasks.length !== parsedInput.taskIds.length) {
          const existingIds = new Set(existingTasks.map((t) => t.id));
          for (const taskId of parsedInput.taskIds) {
            if (!existingIds.has(taskId)) {
              throw new Error(`Validation Error: Task with ID ${taskId} does not exist or is deleted`);
            }
          }
        }
      }

      // Verify project exists
      if (parsedInput.projectId && parsedInput.projectId.trim() !== "") {
        const [existingProject] = await tx
          .select({ id: tables.projects.id })
          .from(tables.projects)
          .where(and(eq(tables.projects.id, parsedInput.projectId), isNull(tables.projects.deleted_at)))
          .limit(1);
        if (!existingProject) {
          throw new Error(`Validation Error: Project with ID ${parsedInput.projectId} does not exist or is deleted`);
        }
      }

      // Overlap check - only if start or end times actually changed
      const timeChanged =
        (parsedInput.startTime && parsedInput.startTime.getTime() !== existing.start_time.getTime()) ||
        (parsedInput.endTime && parsedInput.endTime.getTime() !== existing.end_time.getTime());

      if (timeChanged) {
        const overlaps = await this.checkOverlap(userId, timeRange.start, timeRange.end, logId, tx);
        if (overlaps) {
          throw new Error("Validation Error: Time log overlaps with an existing active log");
        }
      }

      // Update log properties
      const updateData = {
        organization_id: parsedInput.organizationId ?? existing.organization_id,
        team_id: parsedInput.teamId !== undefined ? parsedInput.teamId : existing.team_id,
        project_id: parsedInput.projectId !== undefined ? parsedInput.projectId : existing.project_id,
        start_time: timeRange.start,
        end_time: timeRange.end,
        title: parsedInput.title ?? existing.title,
        description: parsedInput.description ?? existing.description,
        updated_at: new Date(),
        duration: timeRange.durationSeconds,
        is_public: parsedInput.isPublic !== undefined ? parsedInput.isPublic : existing.is_public,
      };

      const [updatedLog] = await tx
        .update(tables.timeLogs)
        .set(updateData)
        .where(eq(tables.timeLogs.id, logId))
        .returning();

      // Synchronize tasks join entries
      if (parsedInput.taskIds !== undefined) {
        await tx.delete(tables.timeLogTasks).where(eq(tables.timeLogTasks.time_log_id, logId));
        if (parsedInput.taskIds.length > 0) {
          const taskLinks = parsedInput.taskIds.map((taskId) => ({
            time_log_id: logId,
            task_id: taskId,
          }));
          await tx.insert(tables.timeLogTasks).values(taskLinks);
        }
      }

      // sync Document Evidence entries
      if (validatedEvidence !== undefined) {
        // Fetch existing active evidence to identify deleted ones
        const existingEvidence = await tx
          .select()
          .from(tables.documentEvidences)
          .where(
            and(
              eq(tables.documentEvidences.time_log_id, logId),
              isNull(tables.documentEvidences.deleted_at)
            )
          );

        const incomingUrls = new Set(validatedEvidence.map((f) => f.fileUrl));
        const deletedFiles = existingEvidence.filter((f) => !incomingUrls.has(f.file_url));

        // Soft-delete all existing evidence linked to the log
        await tx
          .update(tables.documentEvidences)
          .set({ deleted_at: new Date() })
          .where(eq(tables.documentEvidences.time_log_id, logId));

        const evidenceEntries = validatedEvidence.map((file) => ({
          id: crypto.randomUUID(),
          time_log_id: logId,
          file_url: file.fileUrl,
          file_key: file.fileKey,
          file_name: file.fileName,
          file_size: file.fileSize,
          mime_type: file.mimeType,
          created_at: new Date(),
          deleted_at: null,
        }));
        if (evidenceEntries.length > 0) {
          await tx.insert(tables.documentEvidences).values(evidenceEntries);
        }

        // queue files for deletion from storage providers
        filesToDelete = deletedFiles.map((file) => file.file_url);
      }

      // Record Audit Log
      await this.auditService.createAuditLog(
        userId,
        "time_log_update",
        "time_logs",
        logId,
        `Updated time log ${logId}`,
        { input: parsedInput },
        ipAddress,
        userAgent,
        tx
      );

      return updatedLog;
    };
    const updatedLog = await runTransaction(execute);

    if (filesToDelete.length > 0) {
      this.storageService.deleteBatch(filesToDelete).catch((err) => {
        console.error(`Failed to delete storage files: ${err}`);
      });
    }

    const incomingFields = Object.keys(parsedInput);
    await this.notifyObservers("update", updatedLog.id, userId, incomingFields);

    return updatedLog;
  }

  /**
   * Soft-deletes a time log after verifying the owner's authorization.
   * 
   * @throws {Error} If log is not found or user is unauthorized.
   */
  async deleteLog(logId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    z.string().parse(logId);
    z.string().parse(userId);

    const execute = async (tx: DBInstance) => {
      const existing = await tx
        .select()
        .from(tables.timeLogs)
        .where(and(eq(tables.timeLogs.id, logId), isNull(tables.timeLogs.deleted_at)))
        .limit(1)
        .then(rows => rows[0]);
      if (!existing) {
        throw new Error(`Validation Error: Time log with ID ${logId} not found`);
      }

      if (existing.user_id !== userId) {
        throw new Error("Security Error: Unauthorized to delete this time log");
      }

      await tx
        .update(tables.timeLogs)
        .set({ deleted_at: new Date(), updated_at: new Date() })
        .where(eq(tables.timeLogs.id, logId));

      // Record Audit Log
      await this.auditService.createAuditLog(
        userId,
        "time_log_deletion",
        "time_logs",
        logId,
        `Deleted time log ${logId}`,
        undefined,
        ipAddress,
        userAgent,
        tx
      );
    };
    await runTransaction(execute);
    await this.notifyObservers("delete", logId, userId);
    return true;
  }

  /**
   * Administrator method to list all time logs in the system with pagination.
   */
  async adminListLogs(limit = 100, offset = 0, tx: DBInstance = db): Promise<Array<TimeLog | TimeLogSqlite>> {
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);
    const table = tables.timeLogs;
    return await tx
      .select()
      .from(table)
      .limit(limit)
      .offset(offset);
  }

  /**
   * Administrator method to insert a new time log directly.
   */
  async adminCreateLog(data: Partial<NewTimeLog>, tx: DBInstance = db): Promise<TimeLog | TimeLogSqlite> {
    const table = tables.timeLogs;
    const newId = crypto.randomUUID();
    const [res] = await tx
      .insert(table)
      .values({
        id: newId,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      } as any)
      .returning();
    return res;
  }

  /**
   * Administrator method to update any time log directly.
   */
  async adminUpdateLog(id: string, data: Partial<NewTimeLog>, tx: DBInstance = db): Promise<TimeLog | TimeLogSqlite> {
    z.string().parse(id);
    const table = tables.timeLogs;
    const [res] = await tx
      .update(table)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res;
  }

  /**
   * Administrator method to soft-delete any time log directly.
   */
  async adminDeleteLog(id: string, tx: DBInstance = db): Promise<TimeLog | TimeLogSqlite> {
    z.string().parse(id);
    const table = tables.timeLogs;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res;
  }

  /**
   * Bulk inserts multiple time logs efficiently in a single operation.
   */
  async bulkCreateLogs(
    userId: string,
    organizationId: string,
    teamId: string | null,
    logs: BulkLogItemInput[],
    ipAddress?: string,
    userAgent?: string,
    outerTx?: DBInstance
  ): Promise<{ successCount: number }> {
    const execute = async (tx: DBInstance) => {
      if (logs.length === 0) return { successCount: 0 };

      const timeLogValues: NewTimeLog[] = [];
      const timeLogTaskValues: any[] = [];
      const documentEvidenceValues: any[] = [];

      for (const log of logs) {
        const logId = crypto.randomUUID();
        timeLogValues.push({
          id: logId,
          user_id: userId,
          organization_id: organizationId,
          team_id: teamId,
          project_id: log.projectId,
          start_time: log.startTime,
          end_time: log.endTime,
          title: log.title || "Untitled Task",
          description: log.description,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          duration: calculateDurationSeconds(log.startTime, log.endTime),
        });

        if (log.taskIds && log.taskIds.length > 0) {
          log.taskIds.forEach((taskId) => {
            timeLogTaskValues.push({
              time_log_id: logId,
              task_id: taskId,
            });
          });
        }

        if (log.evidence && log.evidence.length > 0) {
          log.evidence.forEach((file) => {
            documentEvidenceValues.push({
              id: crypto.randomUUID(),
              time_log_id: logId,
              file_url: file.fileUrl,
              file_key: file.fileKey,
              file_name: file.fileName,
              file_size: file.fileSize,
              mime_type: file.mimeType,
              created_at: new Date(),
              deleted_at: null,
            });
          });
        }
      }

      await tx.insert(tables.timeLogs).values(timeLogValues);

      if (timeLogTaskValues.length > 0) {
        await tx.insert(tables.timeLogTasks).values(timeLogTaskValues);
      }

      if (documentEvidenceValues.length > 0) {
        await tx.insert(tables.documentEvidences).values(documentEvidenceValues);
      }

      await this.auditService.createAuditLog(
        userId,
        "bulk_time_log_creation",
        "time_logs",
        userId,
        `Bulk created ${logs.length} time logs`,
        { count: logs.length },
        ipAddress,
        userAgent,
        tx
      );

      if (timeLogValues.length > 0) {
        (async () => {
          const chunkSize = 5;
          for (let i = 0; i < timeLogValues.length; i += chunkSize) {
            const chunk = timeLogValues.slice(i, i + chunkSize);
            await Promise.all(
              chunk.map((log) =>
                this.notifyObservers("create", log.id, userId).catch((err) => {
                  console.error(`Observer notification failed for log ${log.id}:`, err);
                })
              )
            );
          }
        })();
      }

      return { successCount: logs.length };
    };

    return outerTx ? await execute(outerTx) : await runTransaction(execute);
  }

  /**
   * Validates and imports time logs from an external schema.
   */
  async importLogs(
    userId: string,
    organizationId: string,
    teamId: string | null,
    logs: ImportedLogInput[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ successCount: number; errors: Array<{ title: string; error: string }> }> {
    const errors: Array<{ title: string; error: string }> = [];
    const uniqueProjNames = Array.from(new Set(logs.map((l) => l.projectName?.trim()).filter(Boolean) as string[]));
    const uniqueTaskTitles = Array.from(
      new Set(
        logs
          .flatMap((l) => l.taskTitles || [])
          .map((t) => t.trim())
          .filter(Boolean)
      )
    );

    const orgProjects = uniqueProjNames.length > 0
      ? await db
          .select()
          .from(tables.projects)
          .where(
            and(
              eq(tables.projects.organization_id, organizationId),
              isNull(tables.projects.deleted_at),
              inArray(tables.projects.name, uniqueProjNames)
            )
          )
      : [];

    const orgTasks = uniqueTaskTitles.length > 0
      ? await db
          .select()
          .from(tables.tasks)
          .where(
            and(
              eq(tables.tasks.organization_id, organizationId),
              isNull(tables.tasks.deleted_at),
              inArray(tables.tasks.title, uniqueTaskTitles)
            )
          )
      : [];

    const logsToCreate: any[] = [];

    for (const log of logs) {
      try {
        if (!log.title) {
          throw new Error("Validation Error: Title is required");
        }
        if (!log.description) {
          throw new Error("Validation Error: Description is required");
        }
        if (log.startTime >= log.endTime) {
          throw new Error("Validation Error: Start time must be before end time");
        }

        let projectId: string | null = null;
        if (log.projectName) {
          const matchedProj = orgProjects.find(
            (p) => p.name.trim().toLowerCase() === log.projectName!.trim().toLowerCase()
          );
          if (matchedProj) {
            projectId = matchedProj.id;
          }
        }

        const taskIds: string[] = [];
        if (log.taskTitles && log.taskTitles.length > 0) {
          log.taskTitles.forEach((title) => {
            const matchedTask = orgTasks.find(
              (t) => t.title.trim().toLowerCase() === title.trim().toLowerCase()
            );
            if (matchedTask) {
              taskIds.push(matchedTask.id);
            }
          });
        }

        const evidence = log.evidenceUrls
          ? log.evidenceUrls.map((url) => {
            const fileName = url.split("/").pop() || "evidence-file";
            return {
              fileUrl: url,
              fileKey: `imported/${crypto.randomUUID()}`,
              fileName,
              fileSize: 1024,
              mimeType: url.endsWith(".png") ? "image/png" : url.endsWith(".jpg") || url.endsWith(".jpeg") ? "image/jpeg" : "application/pdf",
            };
          })
          : [];

        if (evidence.length === 0) {
          evidence.push({
            fileUrl: "https://example.com/imported_placeholder.txt",
            fileKey: "imported/placeholder",
            fileName: "imported_placeholder.txt",
            fileSize: 22,
            mimeType: "text/plain",
          });
        }

        logsToCreate.push({
          title: log.title,
          description: log.description,
          startTime: log.startTime,
          endTime: log.endTime,
          projectId,
          taskIds,
          evidence,
        });
      } catch (err: any) {
        errors.push({
          title: log.title || "Untitled Log",
          error: err.message || "Unknown error",
        });
      }
    }

    if (logsToCreate.length > 0) {
      await this.bulkCreateLogs(
        userId,
        organizationId,
        teamId,
        logsToCreate,
        ipAddress,
        userAgent
      );
    }

    return {
      successCount: logsToCreate.length,
      errors,
    };
  }
}
