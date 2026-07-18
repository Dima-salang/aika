import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getTeamTimelineInputZodSchema,
  getTeamMembersInputZodSchema,
  removeTeamMemberInputZodSchema,
  getUserTeamsInputZodSchema,
  setActiveTeamInputZodSchema,
} from "@/db/schema";
import { LogQueryService } from "@/services/core/LogQueryService";
import { TeamService } from "@/services/auth/TeamService";
import { AuditService } from "@/services/core/AuditService";
import { NotificationService } from "@/services/core/NotificationService";
import { UserService } from "@/services/auth/UserService";
import { OrganizationService } from "@/services/auth/OrganizationService";
import { handleDbError } from "@/utils/db-errors";

const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const userService = new UserService(organizationService, teamService);
const logQueryService = new LogQueryService();

export const teamsRouter = router({
  getTeamTimeline: protectedProcedure
    .input(getTeamTimelineInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        if (!(await teamService.verifyTeamMember(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team member to view this timeline.",
          });
        }
        return await logQueryService.getTeamTimeline(
          input.teamId,
          input.startDate,
          input.endDate,
          input.search,
          input.role,
          input.selectedUser,
          input.limit,
          input.offset
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTeamTimelineInfinite: protectedProcedure
    .input(
      getTeamTimelineInputZodSchema.extend({
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        if (!(await teamService.verifyTeamMember(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team member to view this timeline.",
          });
        }
        const limit = input.limit ?? 10;
        const offset = input.cursor ?? 0;
        const logs = await logQueryService.getTeamTimeline(
          input.teamId,
          input.startDate,
          input.endDate,
          input.search,
          input.role,
          input.selectedUser,
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

  getTeamMembers: protectedProcedure
    .input(getTeamMembersInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        if (!(await teamService.verifyTeamMember(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team member to view team members.",
          });
        }
        return await teamService.getTeamMembersWithDetails(input.teamId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  removeTeamMember: protectedProcedure
    .input(removeTeamMemberInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        if (!(await teamService.verifyLeader(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team leader to manage membership.",
          });
        }
        await teamService.removeTeamMember(input.teamId, input.memberIdToRemove);
        return { success: true };
      } catch (error) {
        handleDbError(error);
      }
    }),

  getUserTeams: protectedProcedure
    .input(getUserTeamsInputZodSchema)
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        return await teamService.getUserTeamsInOrg(input.userId, input.organizationId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  setActiveTeam: protectedProcedure
    .input(setActiveTeamInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.id !== input.userId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "User ID mismatch" });
      }
      try {
        const sessionId = ctx.session.session?.id;
        return await userService.setActiveTeam(input.userId, sessionId, input.teamId);
      } catch (error) {
        handleDbError(error);
      }
    }),
});

