import { db, DBInstance } from "@/db";
import { tables } from "@/db/tables";
import { eq, and, isNull, lt, gt, gte, lte, desc, inArray, or, like, SQL } from "drizzle-orm";
import { z } from "zod";
import { TimeLog, TimeLogSqlite } from "@/db/schema";
import { TimeLogHydrator } from "./TimeLogHydrator";

export interface DetailedTimeLog extends Omit<TimeLog | TimeLogSqlite, "deleted_at"> {
  deleted_at: Date | null;
  tasks: string[];
  evidence: unknown[];
  githubLinks?: unknown[];
  duration: number;
}

export interface TimelineLog {
  id: string;
  user_id: string;
  organization_id: string;
  team_id: string | null;
  project_id: string | null;
  start_time: Date;
  end_time: Date;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  userName: string | null;
  userEmail: string;
  userImage: string | null;
  projectName: string | null;
  userRole: string;
  is_public: boolean;
  tasks: Array<{ id: string; title: string }>;
  evidence: unknown[];
  githubLinks: unknown[];
}

export class LogQueryService {
  /**
   * Fetches a single detailed time log by its ID, including tasks and evidence.
   */
  async getLogById(logId: string, tx: DBInstance = db): Promise<DetailedTimeLog | null> {
    const [log] = await tx
      .select()
      .from(tables.timeLogs)
      .where(and(eq(tables.timeLogs.id, logId), isNull(tables.timeLogs.deleted_at)));
    if (!log) return null;

    const hydration = await TimeLogHydrator.hydrateRelations([logId], tx);
    const rel = hydration[logId] || { tasks: [], evidence: [], githubLinks: [] };

    return {
      ...log,
      tasks: rel.tasks.map((t) => t.id),
      evidence: rel.evidence,
      githubLinks: rel.githubLinks,
    } as DetailedTimeLog;
  }

  /**
   * Retrieves filtered and paginated time logs belonging to a specific user.
   */
  async getUserLogs(
    userId: string,
    filters?: {
      organizationId?: string;
      teamId?: string | null;
      projectId?: string | null;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    },
    limit?: number,
    offset?: number,
    tx: DBInstance = db
  ): Promise<DetailedTimeLog[]> {
    z.string().parse(userId);
    const table = tables.timeLogs;
    const conditions = [
      eq(table.user_id, userId),
      isNull(table.deleted_at),
    ];

    if (filters) {
      if (filters.organizationId) {
        conditions.push(eq(table.organization_id, filters.organizationId));
      }
      if (filters.teamId !== undefined) {
        if (filters.teamId === null) {
          conditions.push(isNull(table.team_id));
        } else {
          conditions.push(eq(table.team_id, filters.teamId));
        }
      }
      if (filters.projectId !== undefined) {
        if (filters.projectId === null) {
          conditions.push(isNull(table.project_id));
        } else {
          conditions.push(eq(table.project_id, filters.projectId));
        }
      }
      if (filters.startDate) {
        conditions.push(gte(table.start_time, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(table.end_time, filters.endDate));
      }
      if (filters.search && filters.search.trim()) {
        const searchPattern = `%${filters.search.toLowerCase()}%`;
        conditions.push(
          or(
            like(table.title, searchPattern),
            like(table.description, searchPattern)
          ) as SQL
        );
      }
    }

    let query = tx
      .select({
        id: table.id,
        user_id: table.user_id,
        organization_id: table.organization_id,
        team_id: table.team_id,
        project_id: table.project_id,
        start_time: table.start_time,
        end_time: table.end_time,
        title: table.title,
        description: table.description,
        created_at: table.created_at,
        updated_at: table.updated_at,
        deleted_at: table.deleted_at,
        notion_page_id: table.notion_page_id,
        duration: table.duration,
        is_public: table.is_public,
        projectName: tables.projects.name,
      })
      .from(table)
      .leftJoin(tables.projects, eq(table.project_id, tables.projects.id))
      .where(and(...conditions))
      .orderBy(desc(table.start_time))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    const logs = await query;

    if (logs.length === 0) {
      return [];
    }

    const logIds = logs.map((l) => l.id);
    const hydration = await TimeLogHydrator.hydrateRelations(logIds, tx);

    return logs.map((log) => {
      const rel = hydration[log.id] || { tasks: [], evidence: [], githubLinks: [] };
      return {
        ...log,
        tasks: rel.tasks.map((t) => t.id),
        evidence: rel.evidence,
        githubLinks: rel.githubLinks,
      };
    }) as DetailedTimeLog[];
  }

  /**
   * Retrieves active time logs scoped to a team with filters.
   */
  async getTeamLogs(
    teamId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number,
    offset?: number
  ): Promise<Array<TimeLog | TimeLogSqlite>> {
    z.string().parse(teamId);
    const table = tables.timeLogs;
    const conditions = [
      eq(table.team_id, teamId),
      isNull(table.deleted_at),
    ];

    if (filters) {
      if (filters.startDate) {
        conditions.push(gte(table.start_time, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(table.end_time, filters.endDate));
      }
    }

    let query = db.select().from(table).where(and(...conditions)).$dynamic();

    // query descending by start_time
    query = query.orderBy(desc(table.start_time));

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.offset(offset);
    }

    return await query;
  }

  /**
   * Compiles the team activity timeline within a given date range and filters.
   */
  async getTeamTimeline(
    teamId: string,
    startDate?: Date,
    endDate?: Date,
    search?: string,
    role?: string,
    selectedUser?: string,
    limit?: number,
    offset?: number,
    tx: DBInstance = db
  ): Promise<TimelineLog[]> {
    z.string().parse(teamId);
    const members = await tx
      .select()
      .from(tables.teamMembers)
      .where(eq(tables.teamMembers.team_id, teamId));
    const memberUserIds = members.map((m) => m.user_id);

    if (memberUserIds.length === 0) {
      return [];
    }

    const timeLogsTable = tables.timeLogs;
    const userTable = tables.user;
    const projectsTable = tables.projects;
    const teamMembersTable = tables.teamMembers;

    const conditions = [
      eq(timeLogsTable.team_id, teamId),
      inArray(timeLogsTable.user_id, memberUserIds),
      isNull(timeLogsTable.deleted_at),
    ];
    if (startDate) {
      conditions.push(gte(timeLogsTable.start_time, startDate));
    }
    if (endDate) {
      conditions.push(lte(timeLogsTable.end_time, endDate));
    }
    if (selectedUser && selectedUser !== "all") {
      conditions.push(eq(timeLogsTable.user_id, selectedUser));
    }
    if (role && role !== "all") {
      conditions.push(eq(teamMembersTable.role, role));
    }
    if (search && search.trim()) {
      const searchPattern = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          like(timeLogsTable.title, searchPattern),
          like(timeLogsTable.description, searchPattern),
          like(userTable.name, searchPattern),
          like(userTable.email, searchPattern),
          like(projectsTable.name, searchPattern)
        ) as SQL
      );
    }

    let query = tx
      .select({
        id: timeLogsTable.id,
        user_id: timeLogsTable.user_id,
        organization_id: timeLogsTable.organization_id,
        team_id: timeLogsTable.team_id,
        project_id: timeLogsTable.project_id,
        start_time: timeLogsTable.start_time,
        end_time: timeLogsTable.end_time,
        title: timeLogsTable.title,
        description: timeLogsTable.description,
        created_at: timeLogsTable.created_at,
        updated_at: timeLogsTable.updated_at,
        duration: timeLogsTable.duration,
        is_public: timeLogsTable.is_public,
        userName: userTable.name,
        userEmail: userTable.email,
        userImage: userTable.image,
        projectName: projectsTable.name,
        userRole: teamMembersTable.role,
      })
      .from(timeLogsTable)
      .innerJoin(userTable, eq(timeLogsTable.user_id, userTable.id))
      .innerJoin(
        teamMembersTable,
        and(
          eq(timeLogsTable.user_id, teamMembersTable.user_id),
          eq(teamMembersTable.team_id, teamId)
        )
      )
      .leftJoin(projectsTable, eq(timeLogsTable.project_id, projectsTable.id))
      .where(and(...conditions))
      .orderBy(desc(timeLogsTable.start_time))
      .$dynamic();

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    const logs = await query;

    if (logs.length === 0) {
      return [];
    }

    const logIds = logs.map((l) => l.id);
    const hydration = await TimeLogHydrator.hydrateRelations(logIds, tx);

    return logs.map((log) => {
      const rel = hydration[log.id] || { tasks: [], evidence: [], githubLinks: [] };
      return {
        ...log,
        tasks: rel.tasks,
        evidence: rel.evidence,
        githubLinks: rel.githubLinks,
      };
    }) as TimelineLog[];
  }
}
