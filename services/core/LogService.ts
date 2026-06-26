import { db, DBInstance, runTransaction } from "@/db";
import { calculateDurationSeconds } from "@/utils/time";
import { TimeLogObserver } from "./TimeLogObserver";
import { TimeLogHydrator } from "./TimeLogHydrator";
import {
  NewTimeLog,
  newTimeLogZodSchema,
  CreateLogInput,
  UpdateLogInput,
  createLogInputZodSchema,
  updateLogInputZodSchema,
  TimeLog,
  TimeLogSqlite,
  Timer,
  TimerSqlite,
  evidenceInputSchema
} from "@/db/schema";
import { eq, and, lt, gt, isNull, ne, inArray, lte, gte, desc, or, like } from "drizzle-orm";
import { SQL } from "drizzle-orm";
import { AuditService } from "./AuditService";
import { isSupportedMimeType } from "@/utils/file";
import { StorageService } from "../integrations/StorageService";
import { TaskService } from "./TaskService";
import { tables } from "../../db/tables";
import crypto from "crypto";
import { z } from "zod";
import { ImportedLogInput } from "../import-export/types";

const stopTimerSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamId: z.string().nullable(),
  taskIds: z.array(z.string()),
  evidence: z.array(
    z.object({
      fileUrl: z.url(),
      fileKey: z.string(),
      fileName: z.string(),
      fileSize: z.number().int().positive(),
      mimeType: z.string(),
    })
  ),
  description: z.string().optional(),
  projectId: z.string().nullable().optional(),
  title: z.string().optional(),
});

export const bulkLogItemSchema = createLogInputZodSchema
  .omit({ organizationId: true, teamId: true, userId: true })
  .extend({
    evidence: z.array(evidenceInputSchema),
  });

export type BulkLogItemInput = z.infer<typeof bulkLogItemSchema>;

export interface DetailedTimeLog extends Omit<TimeLog | TimeLogSqlite, "deleted_at"> {
  deleted_at: Date | null;
  tasks: string[];
  evidence: unknown[];
  duration: number;
}



export interface TimelineLog {
  id: string;
  user_id: string;
  organization_id: string;
  team_id: string | null;
  project_id: string | null;
  start_time: Date;
  end_time: Date;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  projectName: string | null;
  userRole: string;
  is_public: boolean;
  tasks: Array<{ id: string; title: string }>;
  evidence: unknown[];
}

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
    z.date().parse(startTime);
    z.date().parse(endTime);
    z.string().optional().parse(excludeLogId);

    if (startTime >= endTime) {
      throw new Error("Validation Error: Start time must be before end time");
    }

    // check end time is greater than today
    if (endTime > new Date()) {
      throw new Error("Validation Error: End time cannot be in the future.");
    }

    const table = tables.timeLogs;
    const conditions = [
      eq(table.user_id, userId),
      isNull(table.deleted_at),
      lt(table.start_time, endTime),
      gt(table.end_time, startTime),
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

    let successfulLogId: string | null = null;

    const execute = async (tx: DBInstance) => {
      if (parsedInput.evidence) {
        for (const file of parsedInput.evidence) {
          if (file.fileSize > 10 * 1024 * 1024) {
            throw new Error(`Validation Error: File ${file.fileName} exceeds max size limit of 10MB`);
          }
          const mime = file.mimeType.toLowerCase();
          if (!isSupportedMimeType(mime)) {
            throw new Error(`Validation Error: File ${file.fileName} has unsupported type.`);
          }
        }
      }

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

      // Overlap check
      const overlaps = await this.checkOverlap(parsedInput.userId, parsedInput.startTime, parsedInput.endTime, undefined, tx);
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
        start_time: parsedInput.startTime,
        end_time: parsedInput.endTime,
        title: parsedInput.title || "Untitled Task",
        description: parsedInput.description,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        duration: calculateDurationSeconds(parsedInput.startTime, parsedInput.endTime),
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
      const evidenceEntries = parsedInput.evidence.map((file) => ({
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
        `Created time log for duration ${calculateDurationSeconds(parsedInput.startTime, parsedInput.endTime)}s`,
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

    const execute = async (tx: DBInstance) => {
      const existing = await this.getLogById(logId);
      if (!existing) {
        throw new Error(`Validation Error: Time log with ID ${logId} not found`);
      }

      if (existing.user_id !== userId) {
        throw new Error("Security Error: Unauthorized to modify this time log");
      }

      const startTime = parsedInput.startTime ?? existing.start_time;
      const endTime = parsedInput.endTime ?? existing.end_time;

      // Validate size and mimes of new evidence files if passed
      if (parsedInput.evidence) {
        for (const file of parsedInput.evidence) {
          if (file.fileSize > 10 * 1024 * 1024) {
            throw new Error(`Validation Error: File ${file.fileName} exceeds max size limit of 10MB`);
          }
          const mime = file.mimeType.toLowerCase();
          if (!isSupportedMimeType(mime)) {
            throw new Error(`Validation Error: File ${file.fileName} has unsupported type.`);
          }
        }
      }

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

      // Overlap check - only if start or end times actually changed
      const timeChanged =
        (parsedInput.startTime && parsedInput.startTime.getTime() !== existing.start_time.getTime()) ||
        (parsedInput.endTime && parsedInput.endTime.getTime() !== existing.end_time.getTime());

      if (timeChanged) {
        const overlaps = await this.checkOverlap(userId, startTime, endTime, logId, tx);
        if (overlaps) {
          throw new Error("Validation Error: Time log overlaps with an existing active log");
        }
      }

      // Update log properties
      const updateData = {
        organization_id: parsedInput.organizationId ?? existing.organization_id,
        team_id: parsedInput.teamId !== undefined ? parsedInput.teamId : existing.team_id,
        project_id: parsedInput.projectId !== undefined ? parsedInput.projectId : existing.project_id,
        start_time: startTime,
        end_time: endTime,
        title: parsedInput.title ?? existing.title,
        description: parsedInput.description ?? existing.description,
        updated_at: new Date(),
        duration: calculateDurationSeconds(startTime, endTime),
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
      if (parsedInput.evidence !== undefined) {
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

        const incomingUrls = new Set(parsedInput.evidence.map((f) => f.fileUrl));
        const deletedFiles = existingEvidence.filter((f) => !incomingUrls.has(f.file_url));

        // Soft-delete all existing evidence linked to the log
        await tx
          .update(tables.documentEvidences)
          .set({ deleted_at: new Date() })
          .where(eq(tables.documentEvidences.time_log_id, logId));

        const evidenceEntries = parsedInput.evidence.map((file) => ({
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

        // delete files from storage providers
        const file_urls = deletedFiles.map((file) => file.file_url);
        await this.storageService.deleteBatch(file_urls);
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
    const updatedLog = await execute(db);

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
      const existing = await this.getLogById(logId);
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
    await execute(db);
    await this.notifyObservers("delete", logId, userId);
    return true;
  }

  /**
   * Starts a new running timer for a user if they do not already have one active.
   * 
   * @throws {Error} If an active timer is already running for the user.
   */
  async startTimer(
    userId: string,
    projectId: string | null = null,
    description: string | null = null,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Timer | TimerSqlite> {
    z.string().parse(userId);
    z.string().nullable().parse(projectId);
    z.string().nullable().parse(description);

    // Check if running timer already exists
    const active = await this.getRunningTimer(userId);
    if (active) {
      throw new Error("Validation Error: An active timer is already running for this user");
    }

    const timerData = {
      user_id: userId,
      start_time: new Date(),
      description: description || null,
      project_id: projectId || null,
      created_at: new Date(),
    };

    const [newTimer] = await db.insert(tables.timers).values(timerData).returning();

    await this.auditService.createAuditLog(
      userId,
      "timer_start",
      "timers",
      userId,
      "Started a running timer",
      { projectId, description },
      ipAddress,
      userAgent
    );

    return newTimer;
  }

  /**
   * Stops the active running timer, converting its accumulated duration into a saved time log.
   * 
   * @throws {Error} If no active running timer exists for the user.
   */
  async stopTimer(
    userId: string,
    organizationId: string,
    teamId: string | null,
    taskIds: string[],
    evidence: Array<{
      fileUrl: string;
      fileKey: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>,
    description?: string,
    ipAddress?: string,
    userAgent?: string,
    projectId?: string | null,
    title?: string
  ): Promise<TimeLog | TimeLogSqlite> {
    const parsed = stopTimerSchema.parse({
      userId,
      organizationId,
      teamId,
      taskIds,
      evidence,
      description,
      projectId,
      title,
    });

    const active = await this.getRunningTimer(parsed.userId);
    if (!active) {
      throw new Error("Validation Error: No active running timer found for this user");
    }

    const startTime = active.start_time;
    const endTime = new Date();

    return await runTransaction(async (tx: DBInstance) => {
      // 1. Delete the timer first
      await tx.delete(tables.timers).where(eq(tables.timers.user_id, parsed.userId));

      const log = await this.createLog(
        {
          userId: parsed.userId,
          organizationId: parsed.organizationId,
          teamId: parsed.teamId,
          projectId: parsed.projectId !== undefined ? parsed.projectId : active.project_id,
          startTime,
          endTime,
          title: parsed.title || parsed.description || active.description || "Timer-logged hours",
          description: parsed.description || active.description || "Logged via active running timer.",
          taskIds: parsed.taskIds,
          evidence: parsed.evidence,
        },
        ipAddress,
        userAgent,
        tx
      );

      await this.auditService.createAuditLog(
        parsed.userId,
        "timer_stop",
        "timers",
        parsed.userId,
        `Stopped running timer and saved time log ${log.id}`,
        undefined,
        ipAddress,
        userAgent,
        tx
      );

      return log;
    });
  }

  /**
   * Retrieves the active running timer details for a given user.
   */
  async getRunningTimer(userId: string): Promise<Timer | TimerSqlite | null> {
    z.string().parse(userId);
    const [res] = await db.select().from(tables.timers).where(eq(tables.timers.user_id, userId));
    return res || null;
  }

  /**
   * Discards/deletes the running timer for a user without saving the logged time.
   * 
   * @throws {Error} If no active running timer is found.
   */
  async discardTimer(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    z.string().parse(userId);
    const active = await this.getRunningTimer(userId);
    if (!active) {
      throw new Error("Validation Error: No active running timer found for this user");
    }

    await db.delete(tables.timers).where(eq(tables.timers.user_id, userId));

    await this.auditService.createAuditLog(
      userId,
      "timer_discard",
      "timers",
      userId,
      "Discarded active running timer",
      undefined,
      ipAddress,
      userAgent
    );

    return true;
  }

  /**
   * Fetches a single detailed time log by its ID, including tasks and evidence.
   */
  async getLogById(logId: string, tx: DBInstance = db): Promise<DetailedTimeLog | null> {
    const [log] = await tx
      .select()
      .from(tables.timeLogs)
      .where(and(eq(tables.timeLogs.id, logId), isNull(tables.timeLogs.deleted_at)));
    if (!log) return null;

    const hydration = await TimeLogHydrator.hydrateRelations([logId], tx);
    const rel = hydration[logId] || { tasks: [], evidence: [] };

    return {
      ...log,
      tasks: rel.tasks.map((t) => t.id),
      evidence: rel.evidence,
    };
  }

  /**
   * Retrieves filtered and paginated time logs belonging to a specific user.
   */
  async getUserLogs(
    userId: string,
    filters?: {
      organizationId?: string;
      teamId?: string | null;
      projectId?: string | null;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
    limit?: number,
    offset?: number,
    tx: DBInstance = db
  ): Promise<DetailedTimeLog[]> {
    z.string().parse(userId);
    const table = tables.timeLogs;
    const conditions = [
      eq(table.user_id, userId),
      isNull(table.deleted_at),
    ];

    if (filters) {
      if (filters.organizationId) {
        conditions.push(eq(table.organization_id, filters.organizationId));
      }
      if (filters.teamId !== undefined) {
        if (filters.teamId === null) {
          conditions.push(isNull(table.team_id));
        } else {
          conditions.push(eq(table.team_id, filters.teamId));
        }
      }
      if (filters.projectId !== undefined) {
        if (filters.projectId === null) {
          conditions.push(isNull(table.project_id));
        } else {
          conditions.push(eq(table.project_id, filters.projectId));
        }
      }
      if (filters.startDate) {
        conditions.push(gte(table.start_time, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(table.end_time, filters.endDate));
      }
      if (filters.search && filters.search.trim()) {
        const searchPattern = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(table.title, searchPattern),
            like(table.description, searchPattern)
          ) as SQL
        );
      }
    }

    let query = tx
      .select({
        id: table.id,
        user_id: table.user_id,
        organization_id: table.organization_id,
        team_id: table.team_id,
        project_id: table.project_id,
        start_time: table.start_time,
        end_time: table.end_time,
        title: table.title,
        description: table.description,
        created_at: table.created_at,
        updated_at: table.updated_at,
        deleted_at: table.deleted_at,
        notion_page_id: table.notion_page_id,
        duration: table.duration,
        is_public: table.is_public,
        projectName: tables.projects.name,
      })
      .from(table)
      .leftJoin(tables.projects, eq(table.project_id, tables.projects.id))
      .where(and(...conditions))
      .orderBy(desc(table.start_time))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    const logs = await query;

    if (logs.length === 0) {
      return [];
    }

    const logIds = logs.map((l) => l.id);
    const hydration = await TimeLogHydrator.hydrateRelations(logIds, tx);

    return logs.map((log) => {
      const rel = hydration[log.id] || { tasks: [], evidence: [] };
      return {
        ...log,
        tasks: rel.tasks.map((t) => t.id),
        evidence: rel.evidence,
      };
    }) as DetailedTimeLog[];
  }

  /**
   * Retrieves active time logs scoped to a team with filters.
   */
  async getTeamLogs(
    teamId: string,
    filters?: {
      projectId?: string | null;
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number,
    offset?: number
  ): Promise<Array<TimeLog | TimeLogSqlite>> {
    z.string().parse(teamId);
    const table = tables.timeLogs;
    const conditions = [
      eq(table.team_id, teamId),
      isNull(table.deleted_at),
    ];

    if (filters) {
      if (filters.projectId !== undefined) {
        if (filters.projectId === null) {
          conditions.push(isNull(table.project_id));
        } else {
          conditions.push(eq(table.project_id, filters.projectId));
        }
      }
      if (filters.startDate) {
        conditions.push(gte(table.start_time, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(table.end_time, filters.endDate));
      }
    }

    let query = db.select().from(table).where(and(...conditions)).$dynamic();

    // query descending by start_time
    query = query.orderBy(desc(table.start_time));

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
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
   * Compiles the team activity timeline within a given date range and filters.
   */
  async getTeamTimeline(
    teamId: string,
    startDate?: Date,
    endDate?: Date,
    search?: string,
    role?: string,
    selectedUser?: string,
    limit?: number,
    offset?: number,
    tx: DBInstance = db
  ): Promise<TimelineLog[]> {
    z.string().parse(teamId);
    const members = await tx
      .select()
      .from(tables.teamMembers)
      .where(eq(tables.teamMembers.team_id, teamId));
    const memberUserIds = members.map((m) => m.user_id);

    if (memberUserIds.length === 0) {
      return [];
    }

    const timeLogsTable = tables.timeLogs;
    const userTable = tables.user;
    const projectsTable = tables.projects;
    const teamMembersTable = tables.teamMembers;

    const conditions = [
      eq(timeLogsTable.team_id, teamId),
      inArray(timeLogsTable.user_id, memberUserIds),
      isNull(timeLogsTable.deleted_at),
    ];
    if (startDate) {
      conditions.push(gte(timeLogsTable.start_time, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeLogsTable.end_time, endDate));
    }
    if (selectedUser && selectedUser !== "all") {
      conditions.push(eq(timeLogsTable.user_id, selectedUser));
    }
    if (role && role !== "all") {
      conditions.push(eq(teamMembersTable.role, role));
    }
    if (search && search.trim()) {
      const searchPattern = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          like(timeLogsTable.title, searchPattern),
          like(timeLogsTable.description, searchPattern),
          like(userTable.name, searchPattern),
          like(userTable.email, searchPattern),
          like(projectsTable.name, searchPattern)
        ) as SQL
      );
    }

    let query = tx
      .select({
        id: timeLogsTable.id,
        user_id: timeLogsTable.user_id,
        organization_id: timeLogsTable.organization_id,
        team_id: timeLogsTable.team_id,
        project_id: timeLogsTable.project_id,
        start_time: timeLogsTable.start_time,
        end_time: timeLogsTable.end_time,
        title: timeLogsTable.title,
        description: timeLogsTable.description,
        created_at: timeLogsTable.created_at,
        updated_at: timeLogsTable.updated_at,
        duration: timeLogsTable.duration,
        is_public: timeLogsTable.is_public,
        userName: userTable.name,
        userEmail: userTable.email,
        userImage: userTable.image,
        projectName: projectsTable.name,
        userRole: teamMembersTable.role,
      })
      .from(timeLogsTable)
      .innerJoin(userTable, eq(timeLogsTable.user_id, userTable.id))
      .innerJoin(
        teamMembersTable,
        and(
          eq(timeLogsTable.user_id, teamMembersTable.user_id),
          eq(teamMembersTable.team_id, teamId)
        )
      )
      .leftJoin(projectsTable, eq(timeLogsTable.project_id, projectsTable.id))
      .where(and(...conditions))
      .orderBy(desc(timeLogsTable.start_time))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    const logs = await query;

    if (logs.length === 0) {
      return [];
    }

    const logIds = logs.map((l) => l.id);
    const hydration = await TimeLogHydrator.hydrateRelations(logIds, tx);

    // Hydrate logs in memory
    return logs.map((log) => {
      const rel = hydration[log.id] || { tasks: [], evidence: [] };
      return {
        ...log,
        tasks: rel.tasks.map((t) => ({ id: t.id, title: t.title })),
        evidence: rel.evidence,
      };
    }) as TimelineLog[];
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
        Promise.all(
          timeLogValues.map((log) =>
            // TODO: batch notify observers
            // since it might lead to api rate limits
            // we might want to use a queue
            this.notifyObservers("create", log.id, userId).catch((err) => {
              console.error(`Observer notification failed for log ${log.id}:`, err);
            })
          )
        );
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

    const orgProjects = await db.select().from(tables.projects).where(
      and(
        eq(tables.projects.organization_id, organizationId),
        isNull(tables.projects.deleted_at)
      )
    );

    const orgTasks = await db.select().from(tables.tasks).where(
      and(
        eq(tables.tasks.organization_id, organizationId),
        isNull(tables.tasks.deleted_at)
      )
    );

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
