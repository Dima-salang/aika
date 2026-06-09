import { router, publicProcedure } from "../trpc";
import {
  createLogInputZodSchema,
  getLogInputZodSchema,
  getUserLogsInputZodSchema,
  updateLogParentInputZodSchema,
  logIdAndUserIdInputZodSchema,
  startTimerInputZodSchema,
  stopTimerInputZodSchema,
  userIdInputZodSchema,
} from "@/db/schema";
import { handleDbError } from "@/utils/db-errors";

// Service Imports & Instantiation
import { AuditService } from "@/services/AuditService";
import { TaskService } from "@/services/TaskService";
import { LogService } from "@/services/LogService";
import { StorageService } from "@/services/StorageService";

const auditService = new AuditService();
const taskService = new TaskService();
const storageService = StorageService.getInstance();
const logService = new LogService(auditService, taskService, storageService);

export const logsRouter = router({
  getLog: publicProcedure
    .input(getLogInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await logService.getLogById(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getUserLogs: publicProcedure
    .input(getUserLogsInputZodSchema)
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
    .input(updateLogParentInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await logService.updateLog(input.logId, input.userId, input.input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteLog: publicProcedure
    .input(logIdAndUserIdInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await logService.deleteLog(input.logId, input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // Timer procedures
  startTimer: publicProcedure
    .input(startTimerInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await logService.startTimer(input.userId, input.projectId, input.description);
      } catch (error) {
        handleDbError(error);
      }
    }),

  stopTimer: publicProcedure
    .input(stopTimerInputZodSchema)
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
    .input(userIdInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await logService.getRunningTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  discardTimer: publicProcedure
    .input(userIdInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        return await logService.discardTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
