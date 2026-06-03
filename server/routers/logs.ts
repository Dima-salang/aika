import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { createLogInputZodSchema, updateLogInputZodSchema } from "@/db/schema";

// Service Imports & Instantiation
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import { TaskService } from "@/services/TaskService";
import { UserService } from "@/services/UserService";
import { OrganizationService } from "@/services/OrganizationService";
import { TeamService } from "@/services/TeamService";
import { LogService } from "@/services/LogService";

const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const userService = new UserService(organizationService, teamService);
const logService = new LogService(auditService, notificationService, taskService, userService);

export const logsRouter = router({
  getLog: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await logService.getLogById(input.id);
    }),

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
      return await logService.updateLog(input.logId, input.userId, input.input);
    }),

  deleteLog: publicProcedure
    .input(z.object({ logId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
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
      return await logService.getRunningTimer(input.userId);
    }),
});
