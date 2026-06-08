import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { createLogInputZodSchema, updateLogInputZodSchema } from "@/db/schema";
import { handleDbError } from "@/utils/db-errors";

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
      try {
        return await logService.getLogById(input.id);
      } catch (error) {
        handleDbError(error);
      }
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
      try {
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  createLog: publicProcedure
    .input(createLogInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await logService.createLog(input);
      } catch (error) {
        handleDbError(error);
      }
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
      try {
        return await logService.updateLog(input.logId, input.userId, input.input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteLog: publicProcedure
    .input(z.object({ logId: z.string(), userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await logService.deleteLog(input.logId, input.userId);
      } catch (error) {
        handleDbError(error);
      }
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
      try {
        return await logService.startTimer(input.userId, input.projectId, input.description);
      } catch (error) {
        handleDbError(error);
      }
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
      try {
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  getRunningTimer: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await logService.getRunningTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  discardTimer: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        return await logService.discardTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
