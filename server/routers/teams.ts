import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getTeamTimelineInputZodSchema,
  getTeamMembersInputZodSchema,
  removeTeamMemberInputZodSchema,
  getUserTeamsInputZodSchema,
  setActiveTeamInputZodSchema,
} from "@/db/schema";
import { LogService } from "@/services/core/LogService";
import { TeamService } from "@/services/auth/TeamService";
import { AuditService } from "@/services/core/AuditService";
import { NotificationService } from "@/services/core/NotificationService";
import { TaskService } from "@/services/core/TaskService";
import { UserService } from "@/services/auth/UserService";
import { OrganizationService } from "@/services/auth/OrganizationService";
import { handleDbError } from "@/utils/db-errors";
import { StorageService } from "@/services/integrations/StorageService";
import { NotionTimeLogObserver } from "@/services/core/NotionTimeLogObserver";

const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const userService = new UserService(organizationService, teamService);
const storageService = StorageService.getInstance();

const logService = new LogService(
  auditService,
  taskService,
  storageService,
  [new NotionTimeLogObserver()]
);

export const teamsRouter = router({
  getTeamTimeline: publicProcedure
    .input(getTeamTimelineInputZodSchema)
    .query(async ({ input }) => {
      try {
        if (!(await teamService.verifyTeamMember(input.teamId, input.userId))) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You must be a team member to view this timeline.",
          });
        }
        return await logService.getTeamTimeline(
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

  getTeamTimelineInfinite: publicProcedure
    .input(
      getTeamTimelineInputZodSchema.extend({
        cursor: z.number().nullish(),
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
        const limit = input.limit ?? 10;
        const offset = input.cursor ?? 0;
        const logs = await logService.getTeamTimeline(
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

  getTeamMembers: publicProcedure
    .input(getTeamMembersInputZodSchema)
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
    .input(removeTeamMemberInputZodSchema)
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
    .input(getUserTeamsInputZodSchema)
    .query(async ({ input }) => {
      try {
        return await teamService.getUserTeamsInOrg(input.userId, input.organizationId);
      } catch (error) {
        handleDbError(error);
      }
    }),

  setActiveTeam: publicProcedure
    .input(setActiveTeamInputZodSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const sessionId = ctx.session?.session?.id;
        return await userService.setActiveTeam(input.userId, sessionId, input.teamId);
      } catch (error) {
        handleDbError(error);
      }
    }),
});
