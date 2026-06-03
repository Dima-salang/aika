import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import {
  newUserZodSchema,
  userZodSchema,
  newOrganizationZodSchema,
  organizationZodSchema,
  newTeamZodSchema,
  teamZodSchema,
  newProjectZodSchema,
  projectZodSchema,
  newTaskZodSchema,
  taskZodSchema,
  newTimeLogZodSchema,
  timeLogZodSchema,
  notificationZodSchema,
} from "@/db/schema";

// Service Imports
import { AuditService } from "@/services/AuditService";
import { OrganizationService } from "@/services/OrganizationService";
import { TeamService } from "@/services/TeamService";
import { NotificationService } from "@/services/NotificationService";
import { TaskService } from "@/services/TaskService";
import { UserService } from "@/services/UserService";
import { ProjectService } from "@/services/ProjectService";
import { LogService } from "@/services/LogService";

// Instantiate services
const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const projectService = new ProjectService();
const userService = new UserService(organizationService, teamService);
const logService = new LogService(auditService, notificationService, taskService, userService);

export const adminRouter = router({
  // USERS CRUD
  getUsers: publicProcedure.query(async () => {
    return await userService.listUsers(undefined, undefined, 0, 1000);
  }),

  createUser: publicProcedure
    .input(newUserZodSchema)
    .mutation(async ({ input }) => {
      return await userService.createUser(input);
    }),

  updateUser: publicProcedure
    .input(userZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await userService.updateUser(input.id, input);
    }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await userService.deleteUser(input.id);
    }),

  // ORGANIZATIONS CRUD
  getOrgs: publicProcedure.query(async () => {
    return await organizationService.listOrganizations(undefined, 1000);
  }),

  createOrg: publicProcedure
    .input(newOrganizationZodSchema)
    .mutation(async ({ input }) => {
      return await organizationService.createOrganization({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateOrg: publicProcedure
    .input(organizationZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await organizationService.updateOrganization(input.id, input);
    }),

  deleteOrg: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await organizationService.deleteOrganization(input.id);
    }),

  // TEAMS CRUD
  getTeams: publicProcedure.query(async () => {
    return await teamService.listTeams(undefined, 1000);
  }),

  createTeam: publicProcedure
    .input(newTeamZodSchema)
    .mutation(async ({ input }) => {
      return await teamService.addTeam({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTeam: publicProcedure
    .input(teamZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await teamService.updateTeam(input.id, input);
    }),

  deleteTeam: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await teamService.deleteTeam(input.id);
    }),

  // PROJECTS CRUD
  getProjects: publicProcedure.query(async () => {
    return await projectService.listProjects(undefined, 1000);
  }),

  createProject: publicProcedure
    .input(newProjectZodSchema)
    .mutation(async ({ input }) => {
      return await projectService.createProject({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateProject: publicProcedure
    .input(projectZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await projectService.updateProject(input.id, input);
    }),

  deleteProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await projectService.deleteProject(input.id);
    }),

  // TASKS CRUD
  getTasks: publicProcedure.query(async () => {
    return await taskService.listTasks(undefined, 1000);
  }),

  createTask: publicProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ input }) => {
      return await taskService.createTask({
        status: "backlog",
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTask: publicProcedure
    .input(taskZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await taskService.updateTask(input.id, input);
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await taskService.deleteTask(input.id);
    }),

  // TIMELOGS CRUD
  getTimeLogs: publicProcedure.query(async () => {
    return await logService.adminListLogs(1000);
  }),

  createTimeLog: publicProcedure
    .input(newTimeLogZodSchema)
    .mutation(async ({ input }) => {
      return await logService.adminCreateLog({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTimeLog: publicProcedure
    .input(timeLogZodSchema.partial().required({ id: true }))
    .mutation(async ({ input }) => {
      return await logService.adminUpdateLog(input.id, input);
    }),

  deleteTimeLog: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await logService.adminDeleteLog(input.id);
    }),

  // NOTIFICATIONS CRUD
  getNotifications: publicProcedure.query(async () => {
    return await notificationService.listNotifications(undefined, 1000);
  }),

  createNotification: publicProcedure
    .input(
      notificationZodSchema
        .pick({ user_id: true, title: true, message: true, related_id: true })
        .extend({ type: z.string() })
        .partial({ related_id: true })
    )
    .mutation(async ({ input }) => {
      return await notificationService.createNotification(
        input.user_id,
        input.title,
        input.message,
        input.type,
        input.related_id || undefined
      );
    }),

  updateNotification: publicProcedure
    .input(
      notificationZodSchema
        .partial()
        .required({ id: true })
        .extend({ type: z.string().optional() })
    )
    .mutation(async ({ input }) => {
      return await notificationService.updateNotification(input.id, input);
    }),

  deleteNotification: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await notificationService.deleteNotification(input.id);
    }),

  // AUDIT LOGS VIEWER (READ-ONLY)
  getAuditLogs: publicProcedure.query(async () => {
    return await auditService.listAuditLogs(1000);
  }),

  // USER MEMBERSHIPS & ROLES
  getUserMemberships: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const orgMemberships = await organizationService.getUserMemberships(input.userId);
      const teamMemberships = await teamService.getUserMemberships(input.userId);

      return {
        orgMemberships,
        teamMemberships,
      };
    }),

  updateUserMemberships: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        organizationId: z.string().nullable(),
        orgRole: z.string().nullable(),
        teamId: z.string().nullable(),
        teamRole: z.enum(["leader", "member"]).nullable(),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Handle Organization Membership
      const currentOrgs = await organizationService.getUserMemberships(input.userId);
      for (const m of currentOrgs) {
        await organizationService.removeMember(m.organizationId, input.userId);
      }
      if (input.organizationId && input.orgRole) {
        await organizationService.addMember(input.organizationId, input.userId, input.orgRole);
      }

      // 2. Handle Team Membership
      const currentTeams = await teamService.getUserMemberships(input.userId);
      for (const m of currentTeams) {
        await teamService.removeTeamMember(m.team_id, input.userId);
      }
      if (input.teamId && input.teamRole) {
        await teamService.addTeamMember(input.teamId, input.userId, input.teamRole);
      }

      return { success: true };
    }),
});
