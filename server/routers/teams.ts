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
      if (!(await teamService.verifyLeader(input.teamId, input.userId))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team leader to view this timeline.",
        });
      }
      return await logService.getTeamTimeline(input.teamId, input.startDate, input.endDate);
    }),

  getTeamMembers: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string(),
      })
    )
    .query(async ({ input }) => {
      if (!(await teamService.verifyLeader(input.teamId, input.userId))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team leader to view team members.",
        });
      }
      return await teamService.getTeamMembersWithDetails(input.teamId);
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
      if (!(await teamService.verifyLeader(input.teamId, input.userId))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a team leader to manage membership.",
        });
      }
      await teamService.removeTeamMember(input.teamId, input.memberIdToRemove);
      return { success: true };
    }),

  getUserTeams: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await teamService.getUserTeamsInOrg(input.userId, input.organizationId);
    }),

  setActiveTeam: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        teamId: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sessionId = ctx.session?.session?.id;
      return await userService.setActiveTeam(input.userId, sessionId, input.teamId);
    }),
});

