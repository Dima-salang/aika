import { router, publicProcedure, mergeRouters } from "../trpc";
import { ensureSeed } from "@/db/seed";
import { z } from "zod";
import { tokenInputZodSchema, tokenAndUserIdInputZodSchema, userIdInputZodSchema } from "@/db/schema";
import { TRPCError } from "@trpc/server";

// Router Imports
import { adminRouter } from "./admin";
import { tasksRouter } from "./tasks";
import { projectsRouter } from "./projects";
import { logsRouter } from "./logs";
import { teamsRouter } from "./teams";
import { reportsRouter } from "./reports";

import { notificationsRouter } from "./notifications";
import { commentRouter } from "./comments";

// Service Imports
import {
  InvitationService,
  TokenNotFoundError,
  TokenExpiredError,
  TokenLimitReachedError,
} from "@/services/core/InvitationService";
import { OrganizationService } from "@/services/auth/OrganizationService";
import { TeamService } from "@/services/auth/TeamService";
import { AuditService } from "@/services/core/AuditService";
import { NotificationService } from "@/services/core/NotificationService";
import { UserService, UserNotFoundError } from "@/services/auth/UserService";

const auditService = new AuditService();
const notificationService = new NotificationService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const invitationService = new InvitationService(auditService, notificationService, organizationService, teamService);
const userService = new UserService(organizationService, teamService);

// Run database seeding exactly once on startup
ensureSeed().catch((err) => {
  console.error("[Aika Startup] Database seeding failed:", err);
});

// Base router containing healthCheck and nested admin router
const baseRouter = router({
  healthCheck: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),

  validateJoinToken: publicProcedure
    .input(tokenInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await invitationService.validateJoinToken(input.token);
      } catch (err: any) {
        if (err instanceof TokenNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        if (err instanceof TokenExpiredError || err instanceof TokenLimitReachedError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.message || "Failed to validate join token",
        });
      }
    }),

  applyJoinToken: publicProcedure
    .input(tokenAndUserIdInputZodSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await invitationService.applyWithToken(input.token, input.userId);
        return {
          success: true,
          result,
        };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err?.message || "Failed to apply join token",
        });
      }
    }),

  getMyManageProfile: publicProcedure
    .input(userIdInputZodSchema)
    .query(async ({ input }) => {
      return await userService.getManagedProfile(input.userId);
    }),

  getUserProfileDetails: publicProcedure
    .input(z.object({ userId: z.string(), callerId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await userService.getUserProfileDetails(input.userId, input.callerId);
      } catch (err: any) {
        if (err instanceof UserNotFoundError) {
          throw new TRPCError({ code: "NOT_FOUND", message: err.message });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err?.message || "Failed to retrieve user profile details",
        });
      }
    }),

  // Nest admin router
  admin: adminRouter,
});

// Merge all modular sub-routers into the parent appRouter to preserve the flat root-level namespace
export const appRouter = mergeRouters(
  baseRouter,
  tasksRouter,
  projectsRouter,
  logsRouter,
  teamsRouter,
  reportsRouter,
  notificationsRouter,
  commentRouter
);

export type AppRouter = typeof appRouter;
