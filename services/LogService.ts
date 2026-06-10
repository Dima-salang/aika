import { db, DBInstance, runTransaction } from "@/db";
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
} from "@/db/schema";
import { eq, and, lt, gt, isNull, ne, inArray, lte, gte } from "drizzle-orm";
import { AuditService } from "./AuditService";
import { isSupportedMimeType } from "@/utils/file";
import { StorageService } from "./StorageService";
import { TaskService } from "./TaskService";
import { tables } from "./tables";
import crypto from "crypto";
import { z } from "zod";

const stopTimerSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamId: z.string().nullable(),
  taskIds: z.array(z.string()),
  evidence: z.array(
    z.object({
      fileUrl: z.string().url(),
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

export interface DetailedTimeLog extends Omit<TimeLog | TimeLogSqlite, "deleted_at"> {
  deleted_at: Date | null;
  tasks: string[];
  evidence: unknown[];
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
  tasks: Array<{ id: string; title: string }>;
  evidence: unknown[];
}

export class LogService {
  private auditService: AuditService;
  private taskService: TaskService;
  private storageService: StorageService;
  
  constructor(
    auditService: AuditService,
    taskService: TaskService,
    storageService: StorageService
  ) {
    this.auditService = auditService;
    this.taskService = taskService;
    this.storageService = storageService;
  }

  /**
   * Helper to perform overlap validation
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
      .select()
      .from(table)
      .where(and(...conditions));
    return overlapping.length > 0;
  }

  /**
   * Create a new Time Log
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

    const execute = async (tx: DBInstance) => {
      if (!parsedInput.evidence || parsedInput.evidence.length === 0) {
        throw new Error("Validation Error: At least one Document Evidence file is required");
      }

      for (const file of parsedInput.evidence) {
        if (file.fileSize > 10 * 1024 * 1024) {
          throw new Error(`Validation Error: File ${file.fileName} exceeds max size limit of 10MB`);
        }
        const mime = file.mimeType.toLowerCase();
        if (!isSupportedMimeType(mime)) {
          throw new Error(`Validation Error: File ${file.fileName} has unsupported type.`);
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
      };

      const validatedLog = newTimeLogZodSchema.parse(logData) as NewTimeLog;

      const [insertedLog] = await tx.insert(tables.timeLogs).values(validatedLog).returning();

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
      await tx.insert(tables.documentEvidences).values(evidenceEntries);

      // Record Audit Log
      await this.auditService.createAuditLog(
        parsedInput.userId,
        "time_log_creation",
        "time_logs",
        logId,
        `Created time log for duration ${parsedInput.endTime.getTime() - parsedInput.startTime.getTime()}ms`,
        { description: parsedInput.description, taskIds: parsedInput.taskIds },
        ipAddress,
        userAgent,
        tx
      );

      return insertedLog;
    };

    if (outerTx) {
      return await execute(outerTx);
    } else {
      return await runTransaction(execute);
    }
  }

  /**
   * Update an existing Time Log
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

    return await runTransaction(async (tx: DBInstance) => {
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

      // Synchronize Document Evidence entries
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

        if (parsedInput.evidence.length === 0) {
          throw new Error("Validation Error: At least one Document Evidence file is required");
        }
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
        await tx.insert(tables.documentEvidences).values(evidenceEntries);

        // Delete deleted files from physical storage provider(s)
        for (const file of deletedFiles) {
          await this.storageService.delete(file.file_url);
        }
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
    });
  }

  /**
   * Soft-delete a Time Log
   */
  async deleteLog(logId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    z.string().parse(logId);
    z.string().parse(userId);

    return await runTransaction(async (tx: DBInstance) => {
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

      return true;
    });
  }

  /**
   * Start running timer for a user
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
   * Stop running timer and convert to Log
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
   * Retrieve active running timer for a user
   */
  async getRunningTimer(userId: string): Promise<Timer | TimerSqlite | null> {
    z.string().parse(userId);
    const [res] = await db.select().from(tables.timers).where(eq(tables.timers.user_id, userId));
    return res || null;
  }

  /**
   * Discard active running timer for a user
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
   * Fetch single log by ID
   */
  async getLogById(logId: string): Promise<DetailedTimeLog | null> {
    z.string().parse(logId);
    const [log] = await db
      .select()
      .from(tables.timeLogs)
      .where(and(eq(tables.timeLogs.id, logId), isNull(tables.timeLogs.deleted_at)));
    if (!log) return null;

    const tasksList = await db
      .select()
      .from(tables.timeLogTasks)
      .where(eq(tables.timeLogTasks.time_log_id, logId));

    const evidenceList = await db
      .select()
      .from(tables.documentEvidences)
      .where(and(eq(tables.documentEvidences.time_log_id, logId), isNull(tables.documentEvidences.deleted_at)));

    return {
      ...log,
      tasks: tasksList.map((t) => t.task_id),
      evidence: evidenceList,
    };
  }

  /**
   * Fetch active logs for a user with filters
   */
  async getUserLogs(
    userId: string,
    filters?: {
      organizationId?: string;
      teamId?: string | null;
      projectId?: string | null;
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number,
    offset?: number
  ): Promise<Array<TimeLog | TimeLogSqlite>> {
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
    }

    let query = db.select().from(table).where(and(...conditions)).$dynamic();

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  }

  /**
   * Fetch active logs for a team with filters
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

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  }

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

  async getTeamTimeline(teamId: string, startDate?: Date, endDate?: Date, tx: DBInstance = db): Promise<TimelineLog[]> {
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
    const conditions = [
      inArray(timeLogsTable.user_id, memberUserIds),
      isNull(timeLogsTable.deleted_at),
    ];
    if (startDate) {
      conditions.push(gt(timeLogsTable.start_time, startDate));
    }
    if (endDate) {
      conditions.push(lt(timeLogsTable.end_time, endDate));
    }

    // 1. Fetch logs joined with user details & project details in a single query
    const logs = await tx
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
        userName: userTable.name,
        userEmail: userTable.email,
        userImage: userTable.image,
        projectName: projectsTable.name,
      })
      .from(timeLogsTable)
      .innerJoin(userTable, eq(timeLogsTable.user_id, userTable.id))
      .leftJoin(projectsTable, eq(timeLogsTable.project_id, projectsTable.id))
      .where(and(...conditions));

    if (logs.length === 0) {
      return [];
    }

    const logIds = logs.map((l) => l.id);

    // 2. Fetch all evidence in a single query
    const evidenceTable = tables.documentEvidences;
    const evidenceList = await tx
      .select()
      .from(evidenceTable)
      .where(and(inArray(evidenceTable.time_log_id, logIds), isNull(evidenceTable.deleted_at)));

    // 3. Fetch all task links in a single query
    const tasksJoinTable = tables.timeLogTasks;
    const tasksTable = tables.tasks;
    const tasksList = await tx
      .select({
        time_log_id: tasksJoinTable.time_log_id,
        task_id: tasksJoinTable.task_id,
        taskTitle: tasksTable.title,
      })
      .from(tasksJoinTable)
      .innerJoin(tasksTable, eq(tasksJoinTable.task_id, tasksTable.id))
      .where(inArray(tasksJoinTable.time_log_id, logIds));

    // Map evidence and tasks in memory
    const evidenceMap: Record<string, unknown[]> = {};
    evidenceList.forEach((ev) => {
      if (!evidenceMap[ev.time_log_id]) {
        evidenceMap[ev.time_log_id] = [];
      }
      evidenceMap[ev.time_log_id].push(ev);
    });

    const tasksMap: Record<string, Array<{ id: string; title: string }>> = {};
    tasksList.forEach((t) => {
      if (!tasksMap[t.time_log_id]) {
        tasksMap[t.time_log_id] = [];
      }
      tasksMap[t.time_log_id].push({
        id: t.task_id,
        title: t.taskTitle,
      });
    });

    const memberRoleMap: Record<string, string> = {};
    members.forEach((m) => {
      memberRoleMap[m.user_id] = m.role;
    });

    // Hydrate logs in memory
    const hydrated = logs.map((log) => {
      return {
        ...log,
        userRole: memberRoleMap[log.user_id] || "member",
        tasks: tasksMap[log.id] || [],
        evidence: evidenceMap[log.id] || [],
      };
    });

    return hydrated.sort(
      (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );
  }
}
