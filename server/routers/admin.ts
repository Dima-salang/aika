import { router, protectedProcedure, Context } from "../trpc";
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
  paginationInputZodSchema,
  idInputZodSchema,
  userIdInputZodSchema,
  orgIdAndTeamIdInputZodSchema,
  createJoinTokenInputZodSchema,
  reviewJoinRequestInputZodSchema,
  updateUserMembershipsInputZodSchema,
} from "@/db/schema";
import { db } from "@/db";
import { tables } from "@/db/tables";
import { eq, and, or, inArray } from "drizzle-orm";
import { handleDbError } from "@/utils/db-errors";

// Service Imports
import { AuditService } from "@/services/core/AuditService";
import { OrganizationService } from "@/services/auth/OrganizationService";
import { TeamService } from "@/services/auth/TeamService";
import { NotificationService } from "@/services/core/NotificationService";
import { TaskService } from "@/services/core/TaskService";
import { UserService } from "@/services/auth/UserService";
import { ProjectService } from "@/services/core/ProjectService";
import { LogService } from "@/services/core/LogService";
import { InvitationService } from "@/services/core/InvitationService";
import { StorageService } from "@/services/integrations/StorageService";
import { NotionTimeLogObserver } from "@/services/core/NotionTimeLogObserver";

// Instantiate services
const auditService = new AuditService();
const organizationService = new OrganizationService();
const teamService = new TeamService();
const notificationService = new NotificationService();
const taskService = new TaskService();
const projectService = new ProjectService();
const userService = new UserService(organizationService, teamService);
const storageService = StorageService.getInstance();

const logService = new LogService(
  auditService,
  taskService,
  storageService,
  [new NotionTimeLogObserver()]
);
const invitationService = new InvitationService(auditService, notificationService, organizationService, teamService);

// Helper: Check admin panel access and return allowed org IDs
async function checkAdminAccess(ctx: Context) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const userTable = tables.user;
  const [dbUser] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, ctx.session.user.id))
    .limit(1);

  const isSysAdmin = dbUser?.is_admin === true;
  if (isSysAdmin) {
    return { isSysAdmin: true, adminOrgIds: [] as string[] };
  }

  const memberTable = tables.member;
  const userMemberships = await db
    .select()
    .from(memberTable)
    .where(
      and(
        eq(memberTable.userId, ctx.session.user.id),
        or(
          eq(memberTable.role, "admin"),
          eq(memberTable.role, "owner")
        )
      )
    );

  const adminOrgIds = userMemberships.map((m) => m.organizationId);
  if (!adminOrgIds.includes("org-default")) {
    adminOrgIds.push("org-default");
  }

  return { isSysAdmin: false, adminOrgIds };
}

// Helper: Check if user is system admin, organization admin/owner, or team leader
async function checkManageAccess(
  ctx: Context,
  orgId: string | null | undefined,
  teamId: string | null | undefined
) {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (orgId === "org-default") {
    return true;
  }

  const userTable = tables.user;
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
    const memberTable = tables.member;
    const [membership] = await db
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, orgId),
          eq(memberTable.userId, ctx.session.user.id),
          or(
            eq(memberTable.role, "admin"),
            eq(memberTable.role, "owner")
          )
        )
      );
    if (membership) {
      return true;
    }
  }

  // Check Team leader
  if (teamId) {
    const teamMembersTable = tables.teamMembers;
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
  getUsers: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await userService.listUsers(undefined, undefined, 0, 1000);
      let filtered = list;
      if (!isSysAdmin) {
        const memberTable = tables.member;
        const memberships = await db
          .select()
          .from(memberTable)
          .where(inArray(memberTable.organizationId, adminOrgIds));
        const allowedUserIds = new Set(memberships.map((m) => m.userId));
        filtered = list.filter((u) => allowedUserIds.has(u.id));
      }
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createUser: protectedProcedure
    .input(newUserZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin } = await checkAdminAccess(ctx);
        if (input.is_admin === true && !isSysAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only system administrators can create global admin users" });
        }
        const { is_admin: _ignored, ...safeInput } = input;
        return await userService.createUser({
          ...safeInput,
          ...(isSysAdmin && input.is_admin !== undefined ? { is_admin: input.is_admin } : { is_admin: false }),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateUser: protectedProcedure
    .input(userZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const memberTable = tables.member;
          const [m] = await db
            .select()
            .from(memberTable)
            .where(and(eq(memberTable.userId, input.id), inArray(memberTable.organizationId, adminOrgIds)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
          }
        }
        if (input.is_admin === true && !isSysAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only system administrators can grant admin privileges" });
        }
        const { is_admin: _isAdmin, ...rest } = input;
        const safeUpdate = isSysAdmin ? input : rest;
        return await userService.updateUser(input.id, safeUpdate);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteUser: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const memberTable = tables.member;
          const [m] = await db
            .select()
            .from(memberTable)
            .where(and(eq(memberTable.userId, input.id), inArray(memberTable.organizationId, adminOrgIds)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
          }
        }
        return await userService.deleteUser(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // ORGANIZATIONS CRUD
  getOrgs: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await organizationService.listOrganizations(undefined, 1000);
      const filtered = isSysAdmin ? list : list.filter((o) => adminOrgIds.includes(o.id));
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createOrg: protectedProcedure
    .input(newOrganizationZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only system admins can create organizations" });
        }
        return await organizationService.createOrganization({
          ...input,
          id: input.id || crypto.randomUUID(),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateOrg: protectedProcedure
    .input(organizationZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin && !adminOrgIds.includes(input.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this organization" });
        }
        return await organizationService.updateOrganization(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteOrg: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only system admins can delete organizations" });
        }
        return await organizationService.deleteOrganization(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // TEAMS CRUD
  getTeams: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await teamService.listTeams(undefined, 1000);
      const filtered = isSysAdmin ? list : list.filter((t) => adminOrgIds.includes(t.organization_id));
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createTeam: protectedProcedure
    .input(newTeamZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create team in this organization" });
        }
        return await teamService.addTeam({
          ...input,
          id: input.id || crypto.randomUUID(),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateTeam: protectedProcedure
    .input(teamZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetTeam = await teamService.getTeam(input.id);
          if (!targetTeam || !adminOrgIds.includes(targetTeam.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update team in this organization" });
          }
        }
        return await teamService.updateTeam(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTeam: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetTeam = await teamService.getTeam(input.id);
          if (!targetTeam || !adminOrgIds.includes(targetTeam.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete team in this organization" });
          }
        }
        return await teamService.deleteTeam(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // PROJECTS CRUD
  getProjects: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await projectService.listProjects({ limit: 1000 }, undefined);
      const filtered = isSysAdmin ? list : list.filter((p) => adminOrgIds.includes(p.organization_id));
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createProject: protectedProcedure
    .input(newProjectZodSchema.extend({ userId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      try {
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateProject: protectedProcedure
    .input(projectZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetProj = await projectService.getProject(input.id);
          if (!targetProj || !adminOrgIds.includes(targetProj.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update project in this organization" });
          }
        }
        return await projectService.updateProject(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteProject: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetProj = await projectService.getProject(input.id);
          if (!targetProj || !adminOrgIds.includes(targetProj.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete project in this organization" });
          }
        }
        return await projectService.deleteProject(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // TASKS CRUD
  getTasks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await taskService.listTasks(undefined, { limit: 1000 });
      const filtered = isSysAdmin ? list : list.filter((t) => adminOrgIds.includes(t.organization_id));
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createTask: protectedProcedure
    .input(newTaskZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create task in this organization" });
        }
        return await taskService.createTask({
          status: "backlog",
          ...input,
          id: input.id || crypto.randomUUID(),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateTask: protectedProcedure
    .input(taskZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetTask = await taskService.getTaskById(input.id);
          if (!targetTask || !adminOrgIds.includes(targetTask.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update task in this organization" });
          }
        }
        return await taskService.updateTask(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTask: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const targetTask = await taskService.getTaskById(input.id);
          if (!targetTask || !adminOrgIds.includes(targetTask.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete task in this organization" });
          }
        }
        return await taskService.deleteTask(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // TIMELOGS CRUD
  getTimeLogs: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await logService.adminListLogs(1000);
      const filtered = isSysAdmin ? list : list.filter((l) => adminOrgIds.includes(l.organization_id));
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createTimeLog: protectedProcedure
    .input(newTimeLogZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin && !adminOrgIds.includes(input.organization_id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot create log in this organization" });
        }
        return await logService.adminCreateLog({
          ...input,
          id: input.id || crypto.randomUUID(),
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateTimeLog: protectedProcedure
    .input(timeLogZodSchema.partial().required({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const logTable = tables.timeLogs;
          const targetLog = (await db.select().from(logTable).where(eq(logTable.id, input.id)))[0];
          if (!targetLog || !adminOrgIds.includes(targetLog.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update log in this organization" });
          }
        }
        return await logService.adminUpdateLog(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteTimeLog: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const logTable = tables.timeLogs;
          const targetLog = (await db.select().from(logTable).where(eq(logTable.id, input.id)))[0];
          if (!targetLog || !adminOrgIds.includes(targetLog.organization_id)) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete log in this organization" });
          }
        }
        return await logService.adminDeleteLog(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // NOTIFICATIONS CRUD
  getNotifications: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await notificationService.listNotifications(undefined, 1000);
      let filtered = list;
      if (!isSysAdmin) {
        const memberTable = tables.member;
        const memberships = await db
          .select()
          .from(memberTable)
          .where(inArray(memberTable.organizationId, adminOrgIds));
        const allowedUserIds = new Set(memberships.map((m) => m.userId));
        filtered = list.filter((n) => allowedUserIds.has(n.user_id));
      }
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  createNotification: protectedProcedure
    .input(
      notificationZodSchema
        .pick({ user_id: true, title: true, message: true, related_id: true })
        .extend({ type: z.enum(["team_invitation", "task_update", "time_log", "team_switch"]) })
        .partial({ related_id: true })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const memberTable = tables.member;
          const [m] = await db
            .select()
            .from(memberTable)
            .where(and(eq(memberTable.userId, input.user_id), inArray(memberTable.organizationId, adminOrgIds)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN", message: "User is not in your organization" });
          }
        }
        return await notificationService.createNotification({
          userId: input.user_id,
          title: input.title,
          message: input.message,
          type: input.type,
          relatedId: input.related_id || undefined
        });
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateNotification: protectedProcedure
    .input(
      notificationZodSchema
        .partial()
        .required({ id: true })
        .extend({ type: z.enum(["team_invitation", "task_update", "time_log", "team_switch"]).optional() })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const notifTable = tables.notifications;
          const targetNotif = (await db.select().from(notifTable).where(eq(notifTable.id, input.id)))[0];
          if (!targetNotif) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }
          const memberTable = tables.member;
          const [m] = await db
            .select()
            .from(memberTable)
            .where(and(eq(memberTable.userId, targetNotif.user_id), inArray(memberTable.organizationId, adminOrgIds)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        return await notificationService.updateNotification(input.id, input);
      } catch (error) {
        handleDbError(error);
      }
    }),

  deleteNotification: protectedProcedure
    .input(idInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        if (!isSysAdmin) {
          const notifTable = tables.notifications;
          const targetNotif = (await db.select().from(notifTable).where(eq(notifTable.id, input.id)))[0];
          if (!targetNotif) {
            throw new TRPCError({ code: "NOT_FOUND" });
          }
          const memberTable = tables.member;
          const [m] = await db
            .select()
            .from(memberTable)
            .where(and(eq(memberTable.userId, targetNotif.user_id), inArray(memberTable.organizationId, adminOrgIds)));
          if (!m) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        return await notificationService.deleteNotification(input.id);
      } catch (error) {
        handleDbError(error);
      }
    }),

  // AUDIT LOGS VIEWER (READ-ONLY)
  getAuditLogs: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
      const list = await auditService.listAuditLogs(1000);
      let filtered = list;
      if (!isSysAdmin) {
        const memberTable = tables.member;
        const memberships = await db
          .select()
          .from(memberTable)
          .where(inArray(memberTable.organizationId, adminOrgIds));
        const allowedUserIds = new Set(memberships.map((m) => m.userId));
        filtered = list.filter((a) => a.user_id && allowedUserIds.has(a.user_id));
      }
      return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (error) {
      handleDbError(error);
    }
  }),

  // USER MEMBERSHIPS & ROLES
  getUserMemberships: protectedProcedure
    .input(userIdInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx);
        const orgMemberships = await organizationService.getUserMemberships(input.userId);
        const teamMemberships = await teamService.getUserMemberships(input.userId);

        const filteredOrgs = isSysAdmin ? orgMemberships : orgMemberships.filter((m) => adminOrgIds.includes(m.organizationId));
        const filteredTeams = isSysAdmin ? teamMemberships : teamMemberships.filter(() => {
          return true;
        });

        return {
          orgMemberships: filteredOrgs,
          teamMemberships: filteredTeams,
        };
      } catch (error) {
        handleDbError(error);
      }
    }),

  updateUserMemberships: protectedProcedure
    .input(updateUserMembershipsInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  // JOIN REQUESTS & SECURE JOIN TOKENS
  getJoinTokens: protectedProcedure
    .input(orgIdAndTeamIdInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        if (input.organizationId || input.teamId) {
          await checkManageAccess(ctx, input.organizationId, input.teamId);
        } else {
          await checkAdminAccess(ctx);
        }

        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx).catch(() => ({ isSysAdmin: false, adminOrgIds: [] as string[] }));

        const table = tables.joinTokens;
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  getJoinRequests: protectedProcedure
    .input(orgIdAndTeamIdInputZodSchema)
    .query(async ({ ctx, input }) => {
      try {
        if (input.organizationId || input.teamId) {
          await checkManageAccess(ctx, input.organizationId, input.teamId);
        } else {
          await checkAdminAccess(ctx);
        }

        const { isSysAdmin, adminOrgIds } = await checkAdminAccess(ctx).catch(() => ({ isSysAdmin: false, adminOrgIds: [] as string[] }));

        const table = tables.joinRequests;
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
      } catch (error) {
        handleDbError(error);
      }
    }),

  createJoinToken: protectedProcedure
    .input(createJoinTokenInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await checkManageAccess(ctx, input.organizationId, input.teamId);
        return await invitationService.generateJoinToken(
          input.organizationId,
          input.teamId,
          input.createdBy,
          input.expiresInSeconds,
          input.maxUses || null,
          input.autoJoin
        );
      } catch (error) {
        handleDbError(error);
      }
    }),

  reviewJoinRequest: protectedProcedure
    .input(reviewJoinRequestInputZodSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const table = tables.joinRequests;
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
      } catch (error) {
        handleDbError(error);
      }
    }),
});
