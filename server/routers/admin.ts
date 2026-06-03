import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
  joinTokens,
  joinTokensSqlite,
  joinRequests,
  joinRequestsSqlite,
  member,
  memberSqlite,
  teamMembers,
  teamMembersSqlite,
  timeLogs,
  timeLogsSqlite,
  notifications,
  notificationsSqlite,
  user,
  userSqlite,
} from "@/db/schema";
import { db, isSQLite } from "@/db";
import { eq, and, or, inArray } from "drizzle-orm";

// Service Imports
import { AuditService } from "@/services/AuditService";
import { OrganizationService } from "@/services/OrganizationService";
import { TeamService } from "@/services/TeamService";
import { NotificationService } from "@/services/NotificationService";
import { TaskService } from "@/services/TaskService";
import { UserService } from "@/services/UserService";
import { ProjectService } from "@/services/ProjectService";
import { LogService } from "@/services/LogService";
import { InvitationService } from "@/services/InvitationService";

// Instantiate services
const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const projectService = new ProjectService();
const userService = new UserService(organizationService, teamService);
const logService = new LogService(auditService, notificationService, taskService, userService);
const invitationService = new InvitationService(auditService, notificationService, organizationService, teamService);

// Helper: Check admin panel access and return allowed org IDs
async function checkAdminAccess(ctx: any) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const userTable = isSQLite ? userSqlite : user;
  const [dbUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, ctx.session.user.id))
    .limit(1);

  const isSysAdmin = dbUser?.is_admin === true;
  if (isSysAdmin) {
    return { isSysAdmin: true, adminOrgIds: [] as string[] };
  }

  const memberTable = isSQLite ? memberSqlite : member;
  const userMemberships = await db
    .select()
    .from(memberTable)
    .where(
      and(
        eq(memberTable.userId, ctx.session.user.id),
        or(
          eq(memberTable.role, "admin"),
          eq(memberTable.role, "owner"),
          eq(memberTable.role, "system_admin")
        )
      )
    );

  const adminOrgIds = userMemberships.map((m: any) => m.organizationId);
  if (adminOrgIds.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Administrative access denied" });
  }

  return { isSysAdmin: false, adminOrgIds };
}

// Helper: Check if user is system admin, organization admin/owner, or team leader
async function checkManageAccess(
  ctx: any,
  orgId: string | null | undefined,
  teamId: string | null | undefined
) {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const userTable = isSQLite ? userSqlite : user;
  const [dbUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, ctx.session.user.id))
    .limit(1);

  // System admin can do anything
  if (dbUser?.is_admin === true) {
    return true;
  }

  // Check Org admin/owner
  if (orgId) {
    const memberTable = isSQLite ? memberSqlite : member;
    const [membership] = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, orgId),
          eq(memberTable.userId, ctx.session.user.id),
          or(
            eq(memberTable.role, "admin"),
            eq(memberTable.role, "owner"),
            eq(memberTable.role, "system_admin")
          )
        )
      );
    if (membership) {
      return true;
    }
  }

  // Check Team leader
  if (teamId) {
    const teamMembersTable = isSQLite ? teamMembersSqlite : teamMembers;
    const [tm] = await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.team_id, teamId),
          eq(teamMembersTable.user_id, ctx.session.user.id),
          eq(teamMembersTable.role, "leader")
        )
      );
    if (tm) {
      return true;
    }
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You do not have permission to manage this organization or team",
  });
}

export const adminRouter = router({
  // USERS CRUD
  getUsers: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await userService.listUsers(undefined, undefined, 0, 1000);
    let filtered = list;
    if (!isSysAdmin) {
      const memberTable = isSQLite ? memberSqlite : member;
      const memberships = await db
        .select()
        .from(memberTable)
        .where(inArray(memberTable.organizationId, adminOrgIds));
      const allowedUserIds = new Set(memberships.map((m: any) => m.userId));
      filtered = list.filter((u) => allowedUserIds.has(u.id));
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }),

  createUser: publicProcedure
    .input(newUserZodSchema)
    .mutation(async ({ ctx, input }) => {
      await checkAdminAccess(ctx);
      return await userService.createUser(input);
    }),

  updateUser: publicProcedure
    .input(userZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const memberTable = isSQLite ? memberSqlite : member;
        const [m] = await db
          .select()
          .from(memberTable)
          .where(and(eq(memberTable.userId, input.id), inArray(memberTable.organizationId, adminOrgIds)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
        }
      }
      return await userService.updateUser(input.id, input);
    }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const memberTable = isSQLite ? memberSqlite : member;
        const [m] = await db
          .select()
          .from(memberTable)
          .where(and(eq(memberTable.userId, input.id), inArray(memberTable.organizationId, adminOrgIds)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
        }
      }
      return await userService.deleteUser(input.id);
    }),

  // ORGANIZATIONS CRUD
  getOrgs: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await organizationService.listOrganizations(undefined, 1000);
    const filtered = isSysAdmin ? list : list.filter((o) => adminOrgIds.includes(o.id));
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }),

  createOrg: publicProcedure
    .input(newOrganizationZodSchema)
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only system admins can create organizations" });
      }
      return await organizationService.createOrganization({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateOrg: publicProcedure
    .input(organizationZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin && !adminOrgIds.includes(input.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this organization" });
      }
      return await organizationService.updateOrganization(input.id, input);
    }),

  deleteOrg: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only system admins can delete organizations" });
      }
      return await organizationService.deleteOrganization(input.id);
    }),

  // TEAMS CRUD
  getTeams: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await teamService.listTeams(undefined, 1000);
    const filtered = isSysAdmin ? list : list.filter((t) => adminOrgIds.includes(t.organization_id));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  createTeam: publicProcedure
    .input(newTeamZodSchema)
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create team in this organization" });
      }
      return await teamService.addTeam({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTeam: publicProcedure
    .input(teamZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetTeam = await teamService.getTeam(input.id);
        if (!targetTeam || !adminOrgIds.includes(targetTeam.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update team in this organization" });
        }
      }
      return await teamService.updateTeam(input.id, input);
    }),

  deleteTeam: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetTeam = await teamService.getTeam(input.id);
        if (!targetTeam || !adminOrgIds.includes(targetTeam.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete team in this organization" });
        }
      }
      return await teamService.deleteTeam(input.id);
    }),

  // PROJECTS CRUD
  getProjects: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await projectService.listProjects(undefined, 1000);
    const filtered = isSysAdmin ? list : list.filter((p) => adminOrgIds.includes(p.organization_id));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  createProject: publicProcedure
    .input(newProjectZodSchema.extend({ userId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create project in this organization" });
      }
      const { userId, ...projectData } = input;
      return await projectService.createProject(
        {
          ...projectData,
          id: projectData.id || crypto.randomUUID(),
        },
        userId
      );
    }),

  updateProject: publicProcedure
    .input(projectZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetProj = await projectService.getProject(input.id);
        if (!targetProj || !adminOrgIds.includes(targetProj.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update project in this organization" });
        }
      }
      return await projectService.updateProject(input.id, input);
    }),

  deleteProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetProj = await projectService.getProject(input.id);
        if (!targetProj || !adminOrgIds.includes(targetProj.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete project in this organization" });
        }
      }
      return await projectService.deleteProject(input.id);
    }),

  // TASKS CRUD
  getTasks: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await taskService.listTasks(undefined, 1000);
    const filtered = isSysAdmin ? list : list.filter((t) => adminOrgIds.includes(t.organization_id));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  createTask: publicProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create task in this organization" });
      }
      return await taskService.createTask({
        status: "backlog",
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTask: publicProcedure
    .input(taskZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetTask = await taskService.getTaskById(input.id);
        if (!targetTask || !adminOrgIds.includes(targetTask.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update task in this organization" });
        }
      }
      return await taskService.updateTask(input.id, input);
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetTask = await taskService.getTaskById(input.id);
        if (!targetTask || !adminOrgIds.includes(targetTask.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete task in this organization" });
        }
      }
      return await taskService.deleteTask(input.id);
    }),

  // TIMELOGS CRUD
  getTimeLogs: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await logService.adminListLogs(1000);
    const filtered = isSysAdmin ? list : list.filter((l) => adminOrgIds.includes(l.organization_id));
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  createTimeLog: publicProcedure
    .input(newTimeLogZodSchema)
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create log in this organization" });
      }
      return await logService.adminCreateLog({
        ...input,
        id: input.id || crypto.randomUUID(),
      });
    }),

  updateTimeLog: publicProcedure
    .input(timeLogZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetLog = (await db.select().from(isSQLite ? timeLogsSqlite : timeLogs).where(eq((isSQLite ? timeLogsSqlite : timeLogs).id, input.id)))[0];
        if (!targetLog || !adminOrgIds.includes(targetLog.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update log in this organization" });
        }
      }
      return await logService.adminUpdateLog(input.id, input);
    }),

  deleteTimeLog: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetLog = (await db.select().from(isSQLite ? timeLogsSqlite : timeLogs).where(eq((isSQLite ? timeLogsSqlite : timeLogs).id, input.id)))[0];
        if (!targetLog || !adminOrgIds.includes(targetLog.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete log in this organization" });
        }
      }
      return await logService.adminDeleteLog(input.id);
    }),

  // NOTIFICATIONS CRUD
  getNotifications: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await notificationService.listNotifications(undefined, 1000);
    let filtered = list;
    if (!isSysAdmin) {
      const memberTable = isSQLite ? memberSqlite : member;
      const memberships = await db
        .select()
        .from(memberTable)
        .where(inArray(memberTable.organizationId, adminOrgIds));
      const allowedUserIds = new Set(memberships.map((m: any) => m.userId));
      filtered = list.filter((n) => allowedUserIds.has(n.user_id));
    }
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  createNotification: publicProcedure
    .input(
      notificationZodSchema
        .pick({ user_id: true, title: true, message: true, related_id: true })
        .extend({ type: z.string() })
        .partial({ related_id: true })
    )
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const memberTable = isSQLite ? memberSqlite : member;
        const [m] = await db
          .select()
          .from(memberTable)
          .where(and(eq(memberTable.userId, input.user_id), inArray(memberTable.organizationId, adminOrgIds)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
        }
      }
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
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetNotif = (await db.select().from(isSQLite ? notificationsSqlite : notifications).where(eq((isSQLite ? notificationsSqlite : notifications).id, input.id)))[0];
        if (!targetNotif) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const memberTable = isSQLite ? memberSqlite : member;
        const [m] = await db
          .select()
          .from(memberTable)
          .where(and(eq(memberTable.userId, targetNotif.user_id), inArray(memberTable.organizationId, adminOrgIds)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return await notificationService.updateNotification(input.id, input);
    }),

  deleteNotification: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        const targetNotif = (await db.select().from(isSQLite ? notificationsSqlite : notifications).where(eq((isSQLite ? notificationsSqlite : notifications).id, input.id)))[0];
        if (!targetNotif) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const memberTable = isSQLite ? memberSqlite : member;
        const [m] = await db
          .select()
          .from(memberTable)
          .where(and(eq(memberTable.userId, targetNotif.user_id), inArray(memberTable.organizationId, adminOrgIds)));
        if (!m) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return await notificationService.deleteNotification(input.id);
    }),

  // AUDIT LOGS VIEWER (READ-ONLY)
  getAuditLogs: publicProcedure.query(async ({ ctx }) => {
    const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
    const list = await auditService.listAuditLogs(1000);
    let filtered = list;
    if (!isSysAdmin) {
      const memberTable = isSQLite ? memberSqlite : member;
      const memberships = await db
        .select()
        .from(memberTable)
        .where(inArray(memberTable.organizationId, adminOrgIds));
      const allowedUserIds = new Set(memberships.map((m: any) => m.userId));
      filtered = list.filter((a) => a.user_id && allowedUserIds.has(a.user_id));
    }
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }),

  // USER MEMBERSHIPS & ROLES
  getUserMemberships: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const orgMemberships = await organizationService.getUserMemberships(input.userId);
      const teamMemberships = await teamService.getUserMemberships(input.userId);

      const filteredOrgs = isSysAdmin ? orgMemberships : orgMemberships.filter((m) => adminOrgIds.includes(m.organizationId));
      const filteredTeams = isSysAdmin ? teamMemberships : teamMemberships.filter((m) => {
        return true;
      });

      return {
        orgMemberships: filteredOrgs,
        teamMemberships: filteredTeams,
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
    .mutation(async ({ ctx, input }) => {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      if (!isSysAdmin) {
        if (input.organizationId && !adminOrgIds.includes(input.organizationId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot manage memberships for this organization" });
        }
      }
      // 1. Handle Organization Membership
      const currentOrgs = await organizationService.getUserMemberships(input.userId);
      for (const m of currentOrgs) {
        if (isSysAdmin || adminOrgIds.includes(m.organizationId)) {
          await organizationService.removeMember(m.organizationId, input.userId);
        }
      }
      if (input.organizationId && input.orgRole) {
        await organizationService.addMember(input.organizationId, input.userId, input.orgRole);
      }

      // 2. Handle Team Membership
      const currentTeams = await teamService.getUserMemberships(input.userId);
      for (const m of currentTeams) {
        const targetTeam = await teamService.getTeam(m.team_id);
        if (targetTeam && (isSysAdmin || adminOrgIds.includes(targetTeam.organization_id))) {
          await teamService.removeTeamMember(m.team_id, input.userId);
        }
      }
      if (input.teamId && input.teamRole) {
        await teamService.addTeamMember(input.teamId, input.userId, input.teamRole);
      }

      return { success: true };
    }),

  // JOIN REQUESTS & SECURE JOIN TOKENS
  getJoinTokens: publicProcedure
    .input(z.object({ organizationId: z.string().optional(), teamId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.organizationId || input.teamId) {
        await checkManageAccess(ctx, input.organizationId, input.teamId);
      } else {
        await checkAdminAccess(ctx);
      }

      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx).catch(() => ({ isSysAdmin: false, adminOrgIds: [] }));

      const table = isSQLite ? joinTokensSqlite : joinTokens;
      let query = db.select().from(table).$dynamic();
      const conditions = [];

      if (input.organizationId) {
        conditions.push(eq(table.organizationId, input.organizationId));
      }
      if (input.teamId) {
        conditions.push(eq(table.teamId, input.teamId));
      }
      if (!isSysAdmin && adminOrgIds.length > 0 && !input.organizationId && !input.teamId) {
        conditions.push(inArray(table.organizationId, adminOrgIds));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      return await query;
    }),

  getJoinRequests: publicProcedure
    .input(z.object({ organizationId: z.string().optional(), teamId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.organizationId || input.teamId) {
        await checkManageAccess(ctx, input.organizationId, input.teamId);
      } else {
        await checkAdminAccess(ctx);
      }

      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx).catch(() => ({ isSysAdmin: false, adminOrgIds: [] }));

      const table = isSQLite ? joinRequestsSqlite : joinRequests;
      let query = db.select().from(table).$dynamic();
      const conditions = [];
      if (input.organizationId) {
        conditions.push(eq(table.organizationId, input.organizationId));
      }
      if (input.teamId) {
        conditions.push(eq(table.teamId, input.teamId));
      }
      if (!isSysAdmin && adminOrgIds.length > 0 && !input.organizationId && !input.teamId) {
        conditions.push(inArray(table.organizationId, adminOrgIds));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      return await query;
    }),

  createJoinToken: publicProcedure
    .input(
      z.object({
        organizationId: z.string(),
        teamId: z.string().nullable(),
        createdBy: z.string(),
        expiresInSeconds: z.number().int().positive().default(86400),
        maxUses: z.number().int().positive().nullable().optional(),
        autoJoin: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await checkManageAccess(ctx, input.organizationId, input.teamId);
      return await invitationService.generateJoinToken(
        input.organizationId,
        input.teamId,
        input.createdBy,
        input.expiresInSeconds,
        input.maxUses || null,
        input.autoJoin
      );
    }),

  reviewJoinRequest: publicProcedure
    .input(
      z.object({
        requestId: z.string(),
        status: z.enum(["approved", "rejected"]),
        adminId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const table = isSQLite ? joinRequestsSqlite : joinRequests;
      const [reqObj] = await db.select().from(table).where(eq(table.id, input.requestId));
      if (!reqObj) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Join request not found" });
      }
      await checkManageAccess(ctx, reqObj.organizationId, reqObj.teamId);
      return await invitationService.reviewJoinRequest(
        input.requestId,
        input.status,
        input.adminId
      );
    }),
});
