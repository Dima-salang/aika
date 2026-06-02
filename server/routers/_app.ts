import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { db, isSQLite } from "@/db";
import {
  tasks,
  tasksSqlite,
  projects,
  projectsSqlite,
  organization,
  organizationSqlite,
  createLogInputZodSchema,
  updateLogInputZodSchema,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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

// Seeding helper to ensure org-default exists to resolve DB foreign key constraints
async function ensureDefaultOrg() {
  const table = isSQLite ? organizationSqlite : organization;
  const existing = await db.select().from(table).where(eq(table.id, "org-default"));
  if (existing.length === 0) {
    await db.insert(table).values({
      id: "org-default",
      name: "Default Workspace",
      slug: "default-workspace",
      createdAt: new Date(),
    });
  }
}

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),

  // Task procedures
  getTasks: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
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
      await ensureDefaultOrg();
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
      await ensureDefaultOrg();
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
      await ensureDefaultOrg();
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
      await ensureDefaultOrg();
      return await logService.updateLog(input.logId, input.userId, input.input);
    }),

  deleteLog: publicProcedure
    .input(z.object({ logId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      await ensureDefaultOrg();
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
      await ensureDefaultOrg();
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
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await ensureDefaultOrg();
      return await logService.stopTimer(
        input.userId,
        input.organizationId,
        input.teamId || null,
        input.taskIds,
        input.evidence,
        input.description
      );
    }),

  getRunningTimer: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      await ensureDefaultOrg();
      return await logService.getRunningTimer(input.userId);
    }),
});

export type AppRouter = typeof appRouter;
