import { router, publicProcedure } from "../trpc";
import { z } from "zod";
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
import { LogService, DetailedTimeLog } from "@/services/LogService";
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
        return await logService.getUserLogs(
          input.userId,
          {
            organizationId: input.organizationId,
            startDate: input.startDate,
            endDate: input.endDate,
            search: input.search,
            projectId: input.projectId,
          },
          input.limit,
          input.offset
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  getUserLogsInfinite: publicProcedure
    .input(
      getUserLogsInputZodSchema.extend({
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      try {
        const limit = input.limit ?? 10;
        const offset = input.cursor ?? 0;
        const logs = await logService.getUserLogs(
          input.userId,
          {
            organizationId: input.organizationId,
            startDate: input.startDate,
            endDate: input.endDate,
            search: input.search,
            projectId: input.projectId,
          },
          limit + 1,
          offset
        );

        const hasNextPage = logs.length > limit;
        const items = hasNextPage ? logs.slice(0, limit) : logs;
        const nextCursor = hasNextPage ? offset + limit : null;

        return {
          items,
          nextCursor,
        };
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

  disconnectNotion: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const { db, isSQLite } = await import("@/db");
        const { user, userSqlite } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        if (isSQLite) {
          await (db as any).update(userSqlite)
            .set({
              notion_access_token: null,
              notion_database_id: null,
              notion_workspace_name: null,
            })
            .where(eq(userSqlite.id, input.userId));
        } else {
          await db.update(user)
            .set({
              notion_access_token: null,
              notion_database_id: null,
              notion_workspace_name: null,
            })
            .where(eq(user.id, input.userId));
        }
        return { success: true };
      } catch (error) {
        handleDbError(error);
      }
    }),
});
