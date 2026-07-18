import { db, DBInstance, runTransaction } from "@/db";
import { tables } from "@/db/tables";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import { AuditService } from "./AuditService";
import { LogService } from "./LogService";
import { Timer, TimerSqlite, TimeLog, TimeLogSqlite } from "@/db/schema";
import { assertOrgWriteAccess } from "@/services/auth/membership";

const githubLinkInputSchema = z.object({
  repoName: z.string(),
  linkType: z.enum(["commit", "pr"]),
  entityId: z.string(),
  title: z.string(),
  url: z.string().url(),
});

const stopTimerSchema = z.object({
  logId: z.string().optional(),
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
  githubLinks: z.array(githubLinkInputSchema).optional().default([]),
});

export class TimerService {
  private logService: LogService;
  private auditService: AuditService;

  constructor(logService: LogService, auditService: AuditService) {
    this.logService = logService;
    this.auditService = auditService;
  }

  /**
   * Starts a new running timer for a user if they do not already have one active.
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

    const active = await this.getRunningTimer(userId);
    if (active) {
      throw new Error("Validation Error: An active timer is already running for this user");
    }

    if (projectId && projectId.trim() !== "") {
      const [existingProject] = await db
        .select({
          id: tables.projects.id,
          organization_id: tables.projects.organization_id,
          team_id: tables.projects.team_id,
        })
        .from(tables.projects)
        .where(and(eq(tables.projects.id, projectId), isNull(tables.projects.deleted_at)))
        .limit(1);
      if (!existingProject) {
        throw new Error(`Validation Error: Project with ID ${projectId} does not exist or is deleted`);
      }
      await assertOrgWriteAccess(userId, existingProject.organization_id, existingProject.team_id);
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
    title?: string,
    githubLinks?: any[],
    logId?: string
  ): Promise<TimeLog | TimeLogSqlite> {
    const parsed = stopTimerSchema.parse({
      logId,
      userId,
      organizationId,
      teamId,
      taskIds,
      evidence,
      description,
      projectId,
      title,
      githubLinks,
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

      const log = await this.logService.createLog(
        {
          id: parsed.logId || undefined,
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
          githubLinks: parsed.githubLinks,
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
   */
  async discardTimer(userId: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    z.string().parse(userId);
    const active = await this.getRunningTimer(userId);
    if (!active) {
      throw new Error("Validation Error: No active running timer found for this user");
    }

    return await runTransaction(async (tx: DBInstance) => {
      await tx.delete(tables.timers).where(eq(tables.timers.user_id, userId));

      await this.auditService.createAuditLog(
        userId,
        "timer_discard",
        "timers",
        userId,
        "Discarded active running timer",
        undefined,
        ipAddress,
        userAgent,
        tx
      );

      return true;
    });
  }
}
