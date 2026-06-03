import { db, isSQLite } from "@/db";
import {
  timeLogs,
  timeLogsSqlite,
  timeLogTasks,
  timeLogTasksSqlite,
  documentEvidences,
  documentEvidencesSqlite,
  timers,
  timersSqlite,
  NewTimeLog,
  newTimeLogZodSchema,
  CreateLogInput,
  UpdateLogInput,
  ReadLog,
  createLogInputZodSchema,
  updateLogInputZodSchema,
  readLogZodSchema,
} from "@/db/schema";
import { eq, and, lt, gt, isNull, ne } from "drizzle-orm";
import { AuditService } from "./AuditService";
import { NotificationService } from "./NotificationService";
import { TaskService } from "./TaskService";
import { UserService } from "./UserService";

export class LogService {
  private auditService: AuditService;
  private notificationService: NotificationService;
  private taskService: TaskService;
  private userService: UserService;

  constructor(
    auditService: AuditService,
    notificationService: NotificationService,
    taskService: TaskService,
    userService: UserService
  ) {
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.taskService = taskService;
    this.userService = userService;
  }

  /**
   * Helper to perform overlap validation
   */
  private async checkOverlap(
    userId: string,
    startTime: Date,
    endTime: Date,
    excludeLogId?: string,
    tx: any = db
  ): Promise<boolean> {
    if (startTime >= endTime) {
      throw new Error("Validation Error: Start time must be before end time");
    }

    // check end time is greater than today
    if (endTime > new Date()) {
      throw new Error("Validation Error: End time cannot be in the future.");
    }

    if (isSQLite) {
      const conditions = [
        eq(timeLogsSqlite.user_id, userId),
        isNull(timeLogsSqlite.deleted_at),
        lt(timeLogsSqlite.start_time, endTime),
        gt(timeLogsSqlite.end_time, startTime),
      ];
      if (excludeLogId) {
        conditions.push(ne(timeLogsSqlite.id, excludeLogId));
      }
      const overlapping = await tx
        .select()
        .from(timeLogsSqlite)
        .where(and(...conditions));
      return overlapping.length > 0;
    } else {
      const conditions = [
        eq(timeLogs.user_id, userId),
        isNull(timeLogs.deleted_at),
        lt(timeLogs.start_time, endTime),
        gt(timeLogs.end_time, startTime),
      ];
      if (excludeLogId) {
        conditions.push(ne(timeLogs.id, excludeLogId));
      }
      const overlapping = await tx
        .select()
        .from(timeLogs)
        .where(and(...conditions));
      return overlapping.length > 0;
    }
  }

  /**
   * Create a new Time Log
   */
  async createLog(
    input: CreateLogInput,
    ipAddress?: string,
    userAgent?: string,
    outerTx?: any
  ): Promise<any> {
    // If outer transaction exists, run directly. Else trigger a new transaction.
    const execute = async (tx: any) => {
      // 1. Core validations
      const userExists = await this.userService.getUserById(input.userId, tx);
      if (!userExists) {
        throw new Error(`Validation Error: User with ID ${input.userId} does not exist`);
      }

      if (!input.evidence || input.evidence.length === 0) {
        throw new Error("Validation Error: At least one Document Evidence file is required");
      }

      for (const file of input.evidence) {
        if (file.fileSize > 10 * 1024 * 1024) {
          throw new Error(`Validation Error: File ${file.fileName} exceeds max size limit of 10MB`);
        }
        const mime = file.mimeType.toLowerCase();
        if (!mime.startsWith("image/")) {
          throw new Error(`Validation Error: File ${file.fileName} has unsupported type. Images only.`);
        }
      }

      // Verify tasks exist
      if (input.taskIds && input.taskIds.length > 0) {
        for (const taskId of input.taskIds) {
          const taskExists = await this.taskService.getTaskById(taskId, tx);
          if (!taskExists) {
            throw new Error(`Validation Error: Task with ID ${taskId} does not exist or is deleted`);
          }
        }
      }

      // Overlap check
      const overlaps = await this.checkOverlap(input.userId, input.startTime, input.endTime, undefined, tx);
      if (overlaps) {
        throw new Error("Validation Error: Time log overlaps with an existing active log");
      }

      const logId = crypto.randomUUID();


      const logData: NewTimeLog = {
        id: logId,
        user_id: input.userId,
        organization_id: input.organizationId,
        team_id: input.teamId || null,
        project_id: input.projectId || null,
        start_time: input.startTime,
        end_time: input.endTime,
        title: input.title || "Untitled Task",
        description: input.description,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };

      // verify with zod
      const validatedLog = newTimeLogZodSchema.parse(logData);
      let insertedLog: any;

      if (isSQLite) {
        const [res] = await tx.insert(timeLogsSqlite).values(validatedLog).returning();
        insertedLog = res;

        // Insert tasks join entries
        if (input.taskIds && input.taskIds.length > 0) {
          const taskLinks = input.taskIds.map((taskId) => ({
            time_log_id: logId,
            task_id: taskId,
          }));
          await tx.insert(timeLogTasksSqlite).values(taskLinks);
        }

        // Insert Document Evidence entries
        const evidenceEntries = input.evidence.map((file) => ({
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
        await tx.insert(documentEvidencesSqlite).values(evidenceEntries);
      } else {
        const [res] = await tx.insert(timeLogs).values(validatedLog).returning();
        insertedLog = res;

        // Insert tasks join entries
        if (input.taskIds && input.taskIds.length > 0) {
          const taskLinks = input.taskIds.map((taskId) => ({
            time_log_id: logId,
            task_id: taskId,
          }));
          await tx.insert(timeLogTasks).values(taskLinks);
        }

        // Insert Document Evidence entries
        const evidenceEntries = input.evidence.map((file) => ({
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
        await tx.insert(documentEvidences).values(evidenceEntries);
      }

      // Record Audit Log
      await this.auditService.createAuditLog(
        input.userId,
        "time_log_creation",
        "time_logs",
        logId,
        `Created time log for duration ${input.endTime.getTime() - input.startTime.getTime()}ms`,
        { description: input.description, taskIds: input.taskIds },
        ipAddress,
        userAgent,
        tx
      );

      // Create notification
      await this.notificationService.createNotification(
        input.userId,
        "Time Log Created",
        `Time log has been successfully saved.`,
        "time_log",
        logId,
        tx
      );

      return insertedLog;
    };

    if (outerTx) {
      return await execute(outerTx);
    } else {
      return await db.transaction(execute);
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
  ): Promise<any> {
    return await db.transaction(async (tx: any) => {
      const existing = await this.getLogById(logId);
      if (!existing) {
        throw new Error(`Validation Error: Time log with ID ${logId} not found`);
      }

      if (existing.user_id !== userId) {
        throw new Error("Security Error: Unauthorized to modify this time log");
      }

      const startTime = input.startTime ?? existing.start_time;
      const endTime = input.endTime ?? existing.end_time;

      // Validate size and mimes of new evidence files if passed
      if (input.evidence) {
        for (const file of input.evidence) {
          if (file.fileSize > 10 * 1024 * 1024) {
            throw new Error(`Validation Error: File ${file.fileName} exceeds max size limit of 10MB`);
          }
          const mime = file.mimeType.toLowerCase();
          if (!mime.startsWith("image/")) {
            throw new Error(`Validation Error: File ${file.fileName} has unsupported type. Images only.`);
          }
        }
      }

      // Verify tasks exist
      if (input.taskIds && input.taskIds.length > 0) {
        for (const taskId of input.taskIds) {
          const taskExists = await this.taskService.getTaskById(taskId, tx);
          if (!taskExists) {
            throw new Error(`Validation Error: Task with ID ${taskId} does not exist or is deleted`);
          }
        }
      }

      // Overlap check - only if start or end times actually changed
      const timeChanged =
        (input.startTime && input.startTime.getTime() !== existing.start_time.getTime()) ||
        (input.endTime && input.endTime.getTime() !== existing.end_time.getTime());

      if (timeChanged) {
        const overlaps = await this.checkOverlap(userId, startTime, endTime, logId, tx);
        if (overlaps) {
          throw new Error("Validation Error: Time log overlaps with an existing active log");
        }
      }

      // Update log properties
      const updateData = {
        organization_id: input.organizationId ?? existing.organization_id,
        team_id: input.teamId !== undefined ? input.teamId : existing.team_id,
        project_id: input.projectId !== undefined ? input.projectId : existing.project_id,
        start_time: startTime,
        end_time: endTime,
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        updated_at: new Date(),
      };

      let updatedLog: any;

      if (isSQLite) {
        const [res] = await tx
          .update(timeLogsSqlite)
          .set(updateData)
          .where(eq(timeLogsSqlite.id, logId))
          .returning();
        updatedLog = res;

        // Synchronize tasks join entries
        if (input.taskIds !== undefined) {
          // Remove old links
          await tx.delete(timeLogTasksSqlite).where(eq(timeLogTasksSqlite.time_log_id, logId));
          // Add new links
          if (input.taskIds.length > 0) {
            const taskLinks = input.taskIds.map((taskId) => ({
              time_log_id: logId,
              task_id: taskId,
            }));
            await tx.insert(timeLogTasksSqlite).values(taskLinks);
          }
        }

        // Synchronize Document Evidence entries
        if (input.evidence !== undefined) {
          // Soft delete old ones
          await tx
            .update(documentEvidencesSqlite)
            .set({ deleted_at: new Date() })
            .where(eq(documentEvidencesSqlite.time_log_id, logId));

          // Insert new ones
          if (input.evidence.length === 0) {
            throw new Error("Validation Error: At least one Document Evidence file is required");
          }
          const evidenceEntries = input.evidence.map((file) => ({
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
          await tx.insert(documentEvidencesSqlite).values(evidenceEntries);
        }
      } else {
        const [res] = await tx
          .update(timeLogs)
          .set(updateData)
          .where(eq(timeLogs.id, logId))
          .returning();
        updatedLog = res;

        // Synchronize tasks join entries
        if (input.taskIds !== undefined) {
          await tx.delete(timeLogTasks).where(eq(timeLogTasks.time_log_id, logId));
          if (input.taskIds.length > 0) {
            const taskLinks = input.taskIds.map((taskId) => ({
              time_log_id: logId,
              task_id: taskId,
            }));
            await tx.insert(timeLogTasks).values(taskLinks);
          }
        }

        // Synchronize Document Evidence entries
        if (input.evidence !== undefined) {
          await tx
            .update(documentEvidences)
            .set({ deleted_at: new Date() })
            .where(eq(documentEvidences.time_log_id, logId));

          if (input.evidence.length === 0) {
            throw new Error("Validation Error: At least one Document Evidence file is required");
          }
          const evidenceEntries = input.evidence.map((file) => ({
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
          await tx.insert(documentEvidences).values(evidenceEntries);
        }
      }

      // Record Audit Log
      await this.auditService.createAuditLog(
        userId,
        "time_log_update",
        "time_logs",
        logId,
        `Updated time log ${logId}`,
        { input },
        ipAddress,
        userAgent,
        tx
      );

      // Create notification
      await this.notificationService.createNotification(
        userId,
        "Time Log Updated",
        `Time log has been successfully updated.`,
        "time_log",
        logId,
        tx
      );

      return updatedLog;
    });
  }

  /**
   * Soft-delete a Time Log
   */
  async deleteLog(logId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<any> {
    return await db.transaction(async (tx: any) => {
      const existing = await this.getLogById(logId);
      if (!existing) {
        throw new Error(`Validation Error: Time log with ID ${logId} not found`);
      }

      if (existing.user_id !== userId) {
        throw new Error("Security Error: Unauthorized to delete this time log");
      }

      if (isSQLite) {
        await tx
          .update(timeLogsSqlite)
          .set({ deleted_at: new Date(), updated_at: new Date() })
          .where(eq(timeLogsSqlite.id, logId));
      } else {
        await tx
          .update(timeLogs)
          .set({ deleted_at: new Date(), updated_at: new Date() })
          .where(eq(timeLogs.id, logId));
      }

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

      // Create notification
      await this.notificationService.createNotification(
        userId,
        "Time Log Deleted",
        `Time log has been successfully deleted.`,
        "time_log",
        logId,
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
  ): Promise<any> {
    const userExists = await this.userService.getUserById(userId);
    if (!userExists) {
      throw new Error(`Validation Error: User with ID ${userId} does not exist`);
    }

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

    let newTimer: any;
    if (isSQLite) {
      const [res] = await db.insert(timersSqlite).values(timerData).returning();
      newTimer = res;
    } else {
      const [res] = await db.insert(timers).values(timerData).returning();
      newTimer = res;
    }

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
  ): Promise<any> {
    const active = await this.getRunningTimer(userId);
    if (!active) {
      throw new Error("Validation Error: No active running timer found for this user");
    }

    const startTime = active.start_time;
    const endTime = new Date();

    return await db.transaction(async (tx: any) => {
      // 1. Delete the timer first
      if (isSQLite) {
        await tx.delete(timersSqlite).where(eq(timersSqlite.user_id, userId));
      } else {
        await tx.delete(timers).where(eq(timers.user_id, userId));
      }

      const log = await this.createLog(
        {
          userId,
          organizationId,
          teamId,
          projectId: projectId !== undefined ? projectId : active.project_id,
          startTime,
          endTime,
          title: title || description || active.description || "Timer-logged hours",
          description: description || active.description || "Logged via active running timer.",
          taskIds,
          evidence,
        },
        ipAddress,
        userAgent,
        tx
      );

      await this.auditService.createAuditLog(
        userId,
        "timer_stop",
        "timers",
        userId,
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
  async getRunningTimer(userId: string): Promise<any> {
    if (isSQLite) {
      const [res] = await db.select().from(timersSqlite).where(eq(timersSqlite.user_id, userId));
      return res || null;
    } else {
      const [res] = await db.select().from(timers).where(eq(timers.user_id, userId));
      return res || null;
    }
  }

  /**
   * Fetch single log by ID
   */
  async getLogById(logId: string): Promise<any> {
    if (isSQLite) {
      const [log] = await db
        .select()
        .from(timeLogsSqlite)
        .where(and(eq(timeLogsSqlite.id, logId), isNull(timeLogsSqlite.deleted_at)));
      if (!log) return null;

      const tasksList = await db
        .select()
        .from(timeLogTasksSqlite)
        .where(eq(timeLogTasksSqlite.time_log_id, logId));

      const evidenceList = await db
        .select()
        .from(documentEvidencesSqlite)
        .where(and(eq(documentEvidencesSqlite.time_log_id, logId), isNull(documentEvidencesSqlite.deleted_at)));

      return {
        ...log,
        tasks: tasksList.map((t: any) => t.task_id),
        evidence: evidenceList,
      };
    } else {
      const [log] = await db
        .select()
        .from(timeLogs)
        .where(and(eq(timeLogs.id, logId), isNull(timeLogs.deleted_at)));
      if (!log) return null;

      const tasksList = await db
        .select()
        .from(timeLogTasks)
        .where(eq(timeLogTasks.time_log_id, logId));

      const evidenceList = await db
        .select()
        .from(documentEvidences)
        .where(and(eq(documentEvidences.time_log_id, logId), isNull(documentEvidences.deleted_at)));

      return {
        ...log,
        tasks: tasksList.map((t: any) => t.task_id),
        evidence: evidenceList,
      };
    }
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
  ): Promise<any[]> {
    let query = isSQLite
      ? db.select().from(timeLogsSqlite).where(and(eq(timeLogsSqlite.user_id, userId), isNull(timeLogsSqlite.deleted_at)))
      : db.select().from(timeLogs).where(and(eq(timeLogs.user_id, userId), isNull(timeLogs.deleted_at)));

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    const list = await query;

    return list.filter((log: any) => {
      if (filters?.organizationId && log.organization_id !== filters.organizationId) return false;
      if (filters?.teamId !== undefined && log.team_id !== filters.teamId) return false;
      if (filters?.projectId !== undefined && log.project_id !== filters.projectId) return false;
      if (filters?.startDate && log.start_time < filters.startDate) return false;
      if (filters?.endDate && log.end_time > filters.endDate) return false;
      return true;
    });
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
  ): Promise<any[]> {
    let query = isSQLite
      ? db.select().from(timeLogsSqlite).where(and(eq(timeLogsSqlite.team_id, teamId), isNull(timeLogsSqlite.deleted_at)))
      : db.select().from(timeLogs).where(and(eq(timeLogs.team_id, teamId), isNull(timeLogs.deleted_at)));

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    const list = await query;

    return list.filter((log: any) => {
      if (filters?.projectId !== undefined && log.project_id !== filters.projectId) return false;
      if (filters?.startDate && log.start_time < filters.startDate) return false;
      if (filters?.endDate && log.end_time > filters.endDate) return false;
      return true;
    });
  }

  async adminListLogs(limit = 100, offset = 0, tx: any = db): Promise<any[]> {
    const table = isSQLite ? timeLogsSqlite : timeLogs;
    return await tx
      .select()
      .from(table)
      .limit(limit)
      .offset(offset);
  }

  async adminCreateLog(data: any, tx: any = db): Promise<any> {
    const table = isSQLite ? timeLogsSqlite : timeLogs;
    const newId = crypto.randomUUID();
    const [res] = await tx
      .insert(table)
      .values({
        id: newId,
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res;
  }

  async adminUpdateLog(id: string, data: any, tx: any = db): Promise<any> {
    const table = isSQLite ? timeLogsSqlite : timeLogs;
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

  async adminDeleteLog(id: string, tx: any = db): Promise<any> {
    const table = isSQLite ? timeLogsSqlite : timeLogs;
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
}

