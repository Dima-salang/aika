import { router, publicProcedure, protectedProcedure } from "../trpc";
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
import { importedLogZodSchema } from "@/services/import-export/types";
import { TRPCError } from "@trpc/server";

// Service Imports & Instantiation
import { AuditService } from "@/services/core/AuditService";
import { TaskService } from "@/services/core/TaskService";
import { LogService } from "@/services/core/LogService";
import { LogQueryService, DetailedTimeLog } from "@/services/core/LogQueryService";
import { TimerService } from "@/services/core/TimerService";
import { StorageService } from "@/services/integrations/StorageService";
import { NotionTimeLogObserver } from "@/services/core/NotionTimeLogObserver";
import { githubService } from "@/services/integrations/GitHubService";

const auditService = new AuditService();
const taskService = new TaskService();
const storageService = StorageService.getInstance();
const logService = new LogService(
  auditService,
  taskService,
  storageService,
  [new NotionTimeLogObserver()]
);
const logQueryService = new LogQueryService();
const timerService = new TimerService(logService, auditService);

export const logsRouter = router({
  getLog: publicProcedure
    .input(getLogInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        const log = await logQueryService.getLogById(input.id);
        if (!log) return null;

        // public access allowed if is_public is true
        if (log.is_public) {
          return log;
        }

        // otherwise require session authentication
        const session = ctx.session;
        if (!session || !session.user) {
          throw new Error("Security Error: Unauthorized");
        }

        // user is the owner
        if (log.user_id === session.user.id) {
          return log;
        }

        // user is a global admin (custom is_admin field on user)
        const userDetails = session.user as any;
        if (userDetails.is_admin) {
          return log;
        }

        // user belongs to the active organization of the log
        if (session.session.activeOrganizationId === log.organization_id) {
          return log;
        }

        throw new Error("Security Error: Unauthorized");
      } catch (error) {
        handleDbError(error);
      }
    }),

  getUserLogs: protectedProcedure
    .input(getUserLogsInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await logQueryService.getUserLogs(
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

  getUserLogsInfinite: protectedProcedure
    .input(
      getUserLogsInputZodSchema.extend({
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        const limit = input.limit ?? 10;
        const offset = input.cursor ?? 0;
        const logs = await logQueryService.getUserLogs(
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

  createLog: protectedProcedure
    .input(createLogInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await logService.createLog(input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  importLogs: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
        teamId: z.string().nullable().optional(),
        logs: z.array(importedLogZodSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await logService.importLogs(
          input.userId,
          input.organizationId,
          input.teamId ?? null,
          input.logs
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateLog: protectedProcedure
    .input(updateLogParentInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await logService.updateLog(input.logId, input.userId, input.input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteLog: protectedProcedure
    .input(logIdAndUserIdInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await logService.deleteLog(input.logId, input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // Timer procedures
  startTimer: protectedProcedure
    .input(startTimerInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await timerService.startTimer(input.userId, input.projectId, input.description);
      } catch (error) {
        handleDbError(error);
      }
    }),

  stopTimer: protectedProcedure
    .input(stopTimerInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await timerService.stopTimer(
          input.userId,
          input.organizationId,
          input.teamId || null,
          input.taskIds,
          input.evidence,
          input.description,
          undefined,
          undefined,
          input.projectId,
          input.title,
          input.githubLinks,
          input.logId
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  getRunningTimer: protectedProcedure
    .input(userIdInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await timerService.getRunningTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  discardTimer: protectedProcedure
    .input(userIdInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await timerService.discardTimer(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  disconnectNotion: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        const { db, isSQLite } = await import("@/db");
        const { user, userSqlite } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        if (isSQLite) {
          await (db as any).update(userSqlite)
            .set({
              notion_access_token: null,
              notion_workspace_name: null,
            })
            .where(eq(userSqlite.id, input.userId));
        } else {
          await db.update(user)
            .set({
              notion_access_token: null,
              notion_workspace_name: null,
            })
            .where(eq(user.id, input.userId));
        }
        return { success: true };
      } catch (error) {
        handleDbError(error);
      }
    }),

  disconnectGithub: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        const { db } = await import("@/db");
        const { eq, and } = await import("drizzle-orm");
        const { tables } = await import("@/db/tables");

        const accountsTable = tables.account;

        await db.delete(accountsTable)
          .where(and(
            eq(accountsTable.userId, input.userId),
            eq(accountsTable.providerId, "github")
        ));
        return { success: true };
      } catch (error) {
        handleDbError(error);
      }
    }),

  resetNotionDatabase: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        const { db, isSQLite } = await import("@/db");
        const { user, userSqlite } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        if (isSQLite) {
          await (db as any).update(userSqlite)
            .set({
              notion_database_id: null,
            })
            .where(eq(userSqlite.id, input.userId));
        } else {
          await db.update(user)
            .set({
              notion_database_id: null,
            })
            .where(eq(user.id, input.userId));
        }
        return { success: true };
      } catch (error) {
        handleDbError(error);
      }
    }),

  getGitHubUserRepos: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await githubService.getRepos(input.userId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getGitHubRepoCommits: protectedProcedure
    .input(z.object({ userId: z.string(), repoName: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await githubService.getCommits(input.userId, input.repoName);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getGitHubRepoPRs: protectedProcedure
    .input(z.object({ userId: z.string(), repoName: z.string() }))
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await githubService.getPullRequests(input.userId, input.repoName);
      } catch (error) {
        handleDbError(error);
      }
    }),
});

