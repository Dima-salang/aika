import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { db, isSQLite } from "@/db";
import {
  user,
  userSqlite,
  organization,
  organizationSqlite,
  tasks,
  tasksSqlite,
  projects,
  projectsSqlite,
  createLogInputZodSchema,
  updateLogInputZodSchema,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { ensureSeed } from "@/db/seed";

// Router Imports
import { adminRouter } from "./admin";

// Service Imports
import { LogService } from "@/services/LogService";
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import { TaskService } from "@/services/TaskService";
import { UserService } from "@/services/UserService";
import { OrganizationService } from "@/services/OrganizationService";
import { TeamService } from "@/services/TeamService";

// Instantiate services
const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const userService = new UserService(organizationService, teamService);
const logService = new LogService(auditService, notificationService, taskService, userService);

export const appRouter = router({
  healthCheck: publicProcedure.query(async () => {
    await ensureSeed();
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),

  // Merge modular admin router
  admin: adminRouter,

  // Task procedures
  getTasks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      await ensureSeed();
      if (isSQLite) {
        return await db
          .select()
          .from(tasksSqlite)
          .where(and(eq(tasksSqlite.user_id, input.userId), isNull(tasksSqlite.deleted_at)));
      } else {
        return await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.user_id, input.userId), isNull(tasks.deleted_at)));
      }
    }),

  // Project procedures
  getProjects: publicProcedure
    .input(z.object({ organizationId: z.string() }))
    .query(async ({ input }) => {
      await ensureSeed();
      if (isSQLite) {
        return await db
          .select()
          .from(projectsSqlite)
          .where(and(eq(projectsSqlite.organization_id, input.organizationId), isNull(projectsSqlite.deleted_at)));
      } else {
        return await db
          .select()
          .from(projects)
          .where(and(eq(projects.organization_id, input.organizationId), isNull(projects.deleted_at)));
      }
    }),

  // LogService procedures
  getUserLogs: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      await ensureSeed();
      const logs = await logService.getUserLogs(input.userId, {
        organizationId: input.organizationId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      // Hydrate with tasks and evidence for frontend ease-of-use
      const hydrated = await Promise.all(
        logs.map(async (log) => {
          return await logService.getLogById(log.id);
        })
      );
      
      // Sort logs by start_time descending
      return hydrated.filter(Boolean).sort(
        (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
      );
    }),

  createLog: publicProcedure
    .input(createLogInputZodSchema)
    .mutation(async ({ input }) => {
      await ensureSeed();
      return await logService.createLog(input);
    }),

  updateLog: publicProcedure
    .input(
      z.object({
        logId: z.string(),
        userId: z.string(),
        input: updateLogInputZodSchema,
      })
    )
    .mutation(async ({ input }) => {
      await ensureSeed();
      return await logService.updateLog(input.logId, input.userId, input.input);
    }),

  deleteLog: publicProcedure
    .input(z.object({ logId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      await ensureSeed();
      return await logService.deleteLog(input.logId, input.userId);
    }),

  // Timer procedures
  startTimer: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        projectId: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureSeed();
      return await logService.startTimer(input.userId, input.projectId, input.description);
    }),

  stopTimer: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        teamId: z.string().nullable().optional(),
        taskIds: z.array(z.string()),
        evidence: z.array(
          z.object({
            fileUrl: z.string(),
            fileKey: z.string(),
            fileName: z.string(),
            fileSize: z.number(),
            mimeType: z.string(),
          })
        ),
        projectId: z.string().nullable().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureSeed();
      return await logService.stopTimer(
        input.userId,
        input.organizationId,
        input.teamId || null,
        input.taskIds,
        input.evidence,
        input.description,
        undefined,
        undefined,
        input.projectId,
        input.title
      );
    }),

  getRunningTimer: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      await ensureSeed();
      return await logService.getRunningTimer(input.userId);
    }),
});

export type AppRouter = typeof appRouter;
