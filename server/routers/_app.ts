import { router, publicProcedure, mergeRouters } from "../trpc";
import { ensureSeed } from "@/db/seed";
import { z } from "zod";
import { tokenInputZodSchema, tokenAndUserIdInputZodSchema, userIdInputZodSchema } from "@/db/schema";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { eq, and, or } from "drizzle-orm";
import { tables } from "@/db/tables";

// Router Imports
import { adminRouter } from "./admin";
import { tasksRouter } from "./tasks";
import { projectsRouter } from "./projects";
import { logsRouter } from "./logs";
import { teamsRouter } from "./teams";
import { reportsRouter } from "./reports";

import { notificationsRouter } from "./notifications";

// Service Imports

import { InvitationService } from "@/services/core/InvitationService";
import { OrganizationService } from "@/services/auth/OrganizationService";
import { TeamService } from "@/services/auth/TeamService";
import { AuditService } from "@/services/core/AuditService";
import { NotificationService } from "@/services/core/NotificationService";

const auditService = new AuditService();
const notificationService = new NotificationService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const invitationService = new InvitationService(auditService, notificationService, organizationService, teamService);

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
      const tokenTable = tables.joinTokens;
      const [tokenRecord] = await db
        .select()
        .from(tokenTable)
        .where(eq(tokenTable.id, input.token))
        .limit(1);

      if (!tokenRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid join token" });
      }

      if (new Date() > new Date(tokenRecord.expiresAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Join token has expired" });
      }

      if (tokenRecord.maxUses !== null && tokenRecord.usesCount >= tokenRecord.maxUses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Join token usage limit reached" });
      }

      const org = await organizationService.getOrganization(tokenRecord.organizationId);
      const team = tokenRecord.teamId ? await teamService.getTeam(tokenRecord.teamId) : null;

      return {
        valid: true,
        organizationId: tokenRecord.organizationId,
        organizationName: org?.name || "Unknown Workspace",
        teamId: tokenRecord.teamId,
        teamName: team?.name || null,
        autoJoin: tokenRecord.autoJoin,
      };
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
      const memberTable = tables.member;
      const teamMembersTable = tables.teamMembers;

      const orgMemberships = await db
        .select()
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, input.userId),
            or(
              eq(memberTable.role, "admin"),
              eq(memberTable.role, "owner"),
              eq(memberTable.role, "system_admin")
            )
          )
        );

      const managedOrgs = [];
      for (const m of orgMemberships) {
        const orgObj = await organizationService.getOrganization(m.organizationId);
        if (orgObj) {
          managedOrgs.push(orgObj);
        }
      }

      const teamMemberships = await db
        .select()
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.user_id, input.userId),
            eq(teamMembersTable.role, "leader")
          )
        );

      const managedTeams = [];
      for (const tm of teamMemberships) {
        const teamObj = await teamService.getTeam(tm.team_id);
        if (teamObj) {
          managedTeams.push(teamObj);
        }
      }

      return {
        managedOrgs,
        managedTeams,
      };
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
  notificationsRouter
);

export type AppRouter = typeof appRouter;
