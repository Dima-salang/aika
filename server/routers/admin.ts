import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { db, isSQLite } from "@/db";
import {
  user,
  userSqlite,
  organization,
  organizationSqlite,
  teams,
  teamsSqlite,
  projects,
  projectsSqlite,
  tasks,
  tasksSqlite,
  timeLogs,
  timeLogsSqlite,
  notifications,
  notificationsSqlite,
  auditLogs,
  auditLogsSqlite,
  memberSqlite,
  member,
  teamMembersSqlite,
  teamMembers,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const adminRouter = router({
  // USERS CRUD
  getUsers: publicProcedure.query(async () => {
    const table = isSQLite ? userSqlite : user;
    return await db.select().from(table);
  }),

  createUser: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        is_admin: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? userSqlite : user;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          name: input.name,
          email: input.email,
          emailVerified: false,
          is_admin: input.is_admin,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return res;
    }),

  updateUser: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        is_admin: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? userSqlite : user;
      const [res] = await db
        .update(table)
        .set({
          name: input.name,
          email: input.email,
          is_admin: input.is_admin,
          updatedAt: new Date(),
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? userSqlite : user;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // ORGANIZATIONS CRUD
  getOrgs: publicProcedure.query(async () => {
    const table = isSQLite ? organizationSqlite : organization;
    return await db.select().from(table);
  }),

  createOrg: publicProcedure
    .input(
      z.object({
        name: z.string(),
        slug: z.string(),
        metadata: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? organizationSqlite : organization;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          name: input.name,
          slug: input.slug,
          metadata: input.metadata || null,
          createdAt: new Date(),
        })
        .returning();
      return res;
    }),

  updateOrg: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        metadata: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? organizationSqlite : organization;
      const [res] = await db
        .update(table)
        .set({
          name: input.name,
          slug: input.slug,
          metadata: input.metadata || null,
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteOrg: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? organizationSqlite : organization;
      const [res] = await db.delete(table).where(eq(table.id, input.id)).returning();
      return res;
    }),

  // TEAMS CRUD
  getTeams: publicProcedure.query(async () => {
    const table = isSQLite ? teamsSqlite : teams;
    return await db.select().from(table);
  }),

  createTeam: publicProcedure
    .input(
      z.object({
        organization_id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? teamsSqlite : teams;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          organization_id: input.organization_id,
          name: input.name,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      return res;
    }),

  updateTeam: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        organization_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? teamsSqlite : teams;
      const [res] = await db
        .update(table)
        .set({
          name: input.name,
          organization_id: input.organization_id,
          updated_at: new Date(),
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteTeam: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? teamsSqlite : teams;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // PROJECTS CRUD
  getProjects: publicProcedure.query(async () => {
    const table = isSQLite ? projectsSqlite : projects;
    return await db.select().from(table);
  }),

  createProject: publicProcedure
    .input(
      z.object({
        organization_id: z.string(),
        team_id: z.string().nullable().optional(),
        name: z.string(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? projectsSqlite : projects;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          organization_id: input.organization_id,
          team_id: input.team_id || null,
          name: input.name,
          description: input.description || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      return res;
    }),

  updateProject: publicProcedure
    .input(
      z.object({
        id: z.string(),
        organization_id: z.string(),
        team_id: z.string().nullable().optional(),
        name: z.string(),
        description: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? projectsSqlite : projects;
      const [res] = await db
        .update(table)
        .set({
          organization_id: input.organization_id,
          team_id: input.team_id || null,
          name: input.name,
          description: input.description || null,
          updated_at: new Date(),
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteProject: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? projectsSqlite : projects;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // TASKS CRUD
  getTasks: publicProcedure.query(async () => {
    const table = isSQLite ? tasksSqlite : tasks;
    return await db.select().from(table);
  }),

  createTask: publicProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().nullable().optional(),
        status: z.enum(["backlog", "todo", "in_progress", "done"]),
        priority: z.enum(["low", "medium", "high"]).nullable().optional(),
        user_id: z.string(),
        organization_id: z.string(),
        project_id: z.string().nullable().optional(),
        team_id: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? tasksSqlite : tasks;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          title: input.title,
          description: input.description || null,
          status: input.status,
          priority: input.priority || null,
          user_id: input.user_id,
          organization_id: input.organization_id,
          project_id: input.project_id || null,
          team_id: input.team_id || null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      return res;
    }),

  updateTask: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().nullable().optional(),
        status: z.enum(["backlog", "todo", "in_progress", "done"]),
        priority: z.enum(["low", "medium", "high"]).nullable().optional(),
        user_id: z.string(),
        organization_id: z.string(),
        project_id: z.string().nullable().optional(),
        team_id: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? tasksSqlite : tasks;
      const [res] = await db
        .update(table)
        .set({
          title: input.title,
          description: input.description || null,
          status: input.status,
          priority: input.priority || null,
          user_id: input.user_id,
          organization_id: input.organization_id,
          project_id: input.project_id || null,
          team_id: input.team_id || null,
          updated_at: new Date(),
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteTask: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? tasksSqlite : tasks;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // TIMELOGS CRUD
  getTimeLogs: publicProcedure.query(async () => {
    const table = isSQLite ? timeLogsSqlite : timeLogs;
    return await db.select().from(table);
  }),

  createTimeLog: publicProcedure
    .input(
      z.object({
        user_id: z.string(),
        organization_id: z.string(),
        project_id: z.string().nullable().optional(),
        team_id: z.string().nullable().optional(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date(),
        title: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? timeLogsSqlite : timeLogs;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          user_id: input.user_id,
          organization_id: input.organization_id,
          project_id: input.project_id || null,
          team_id: input.team_id || null,
          start_time: input.start_time,
          end_time: input.end_time,
          title: input.title,
          description: input.description,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      return res;
    }),

  updateTimeLog: publicProcedure
    .input(
      z.object({
        id: z.string(),
        user_id: z.string(),
        organization_id: z.string(),
        project_id: z.string().nullable().optional(),
        team_id: z.string().nullable().optional(),
        start_time: z.coerce.date(),
        end_time: z.coerce.date(),
        title: z.string(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? timeLogsSqlite : timeLogs;
      const [res] = await db
        .update(table)
        .set({
          user_id: input.user_id,
          organization_id: input.organization_id,
          project_id: input.project_id || null,
          team_id: input.team_id || null,
          start_time: input.start_time,
          end_time: input.end_time,
          title: input.title,
          description: input.description,
          updated_at: new Date(),
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteTimeLog: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? timeLogsSqlite : timeLogs;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // NOTIFICATIONS CRUD
  getNotifications: publicProcedure.query(async () => {
    const table = isSQLite ? notificationsSqlite : notifications;
    return await db.select().from(table);
  }),

  createNotification: publicProcedure
    .input(
      z.object({
        user_id: z.string(),
        title: z.string(),
        message: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? notificationsSqlite : notifications;
      const newId = crypto.randomUUID();
      const [res] = await db
        .insert(table)
        .values({
          id: newId,
          user_id: input.user_id,
          title: input.title,
          message: input.message,
          type: input.type,
          is_read: false,
          created_at: new Date(),
        })
        .returning();
      return res;
    }),

  updateNotification: publicProcedure
    .input(
      z.object({
        id: z.string(),
        user_id: z.string(),
        title: z.string(),
        message: z.string(),
        type: z.string(),
        is_read: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const table = isSQLite ? notificationsSqlite : notifications;
      const [res] = await db
        .update(table)
        .set({
          user_id: input.user_id,
          title: input.title,
          message: input.message,
          type: input.type,
          is_read: input.is_read,
        })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  deleteNotification: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const table = isSQLite ? notificationsSqlite : notifications;
      const [res] = await db
        .update(table)
        .set({ deleted_at: new Date() })
        .where(eq(table.id, input.id))
        .returning();
      return res;
    }),

  // AUDIT LOGS VIEWER (READ-ONLY)
  getAuditLogs: publicProcedure.query(async () => {
    const table = isSQLite ? auditLogsSqlite : auditLogs;
    return await db.select().from(table);
  }),

  // USER MEMBERSHIPS & ROLES
  getUserMemberships: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const orgMemberTable = isSQLite ? memberSqlite : member;
      const teamMemberTable = isSQLite ? teamMembersSqlite : teamMembers;
      
      const orgMemberships = await db
        .select()
        .from(orgMemberTable)
        .where(eq(orgMemberTable.userId, input.userId));

      const teamMemberships = await db
        .select()
        .from(teamMemberTable)
        .where(eq(teamMemberTable.user_id, input.userId));

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
      const orgMemberTable = isSQLite ? memberSqlite : member;
      const teamMemberTable = isSQLite ? teamMembersSqlite : teamMembers;

      // 1. Handle Organization Membership
      // Delete old org memberships first
      await db.delete(orgMemberTable).where(eq(orgMemberTable.userId, input.userId));
      
      if (input.organizationId && input.orgRole) {
        const id = `${input.organizationId}-${input.userId}`;
        await db.insert(orgMemberTable).values({
          id,
          organizationId: input.organizationId,
          userId: input.userId,
          role: input.orgRole,
          createdAt: new Date(),
        });
      }

      // 2. Handle Team Membership
      // Delete old team memberships first
      await db.delete(teamMemberTable).where(eq(teamMemberTable.user_id, input.userId));

      if (input.teamId && input.teamRole) {
        const id = `${input.teamId}-${input.userId}`;
        await db.insert(teamMemberTable).values({
          id,
          team_id: input.teamId,
          user_id: input.userId,
          role: input.teamRole,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      return { success: true };
    }),
});
