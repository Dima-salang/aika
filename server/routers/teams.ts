import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { LogService } from "@/services/LogService";
import { TeamService } from "@/services/TeamService";
import { AuditService } from "@/services/AuditService";
import { NotificationService } from "@/services/NotificationService";
import { TaskService } from "@/services/TaskService";
import { UserService } from "@/services/UserService";
import { OrganizationService } from "@/services/OrganizationService";
import { handleDbError } from "@/utils/db-errors";

const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const userService = new UserService(organizationService, teamService);
const logService = new LogService(auditService, notificationService, taskService, userService);

export const teamsRouter = router({
  getTeamTimeline: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        if (!(await teamService.verifyTeamMember(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team member to view this timeline.",
          });
        }
        return await logService.getTeamTimeline(input.teamId, input.startDate, input.endDate);
      } catch (error) {
        handleDbError(error);
      }
    }),

  getTeamMembers: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
      })
    )
    .query(async ({ input }) => {
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

  removeTeamMember: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
        memberIdToRemove: z.string(),
      })
    )
    .mutation(async ({ input }) => {
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

  getUserTeams: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await teamService.getUserTeamsInOrg(input.userId, input.organizationId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  setActiveTeam: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const sessionId = ctx.session?.session?.id;
        return await userService.setActiveTeam(input.userId, sessionId, input.teamId);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
