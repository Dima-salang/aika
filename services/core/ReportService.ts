import { db, DBInstance } from "@/db";
import { tables } from "../../db/tables";
import { eq, and, isNull, inArray, gte, lte, sum, desc } from "drizzle-orm";
import { z } from "zod";
import { TimeLog, TimeLogSqlite } from "@/db/schema";
import { calculateDurationHours } from "@/utils/time";
import { TimeLogHydrator } from "./TimeLogHydrator";

export interface ReportSummaryKPIs {
  totalHours: number;
  totalSessions: number;
  averageSessionHours: number;
  activeProjects: number;
}

export interface ProjectTimeBreakdown {
  projectId: string | null;
  projectName: string;
  hours: number;
  percentage: number;
}

export interface TaskStatusBreakdown {
  status: string;
  count: number;
}

export interface DailyChartItem {
  date: string; // YYYY-MM-DD
  hours: number;
}

export interface DetailedReportLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  projectName: string | null;
  taskTitles: string[];
  evidenceUrls: string[];
}

export interface MemberWorkloadItem {
  userId: string;
  userName: string;
  userEmail: string;
  totalHours: number;
  totalSessions: number;
  averageSessionHours: number;
  tasksCompleted: number;
}

export interface PersonalReport {
  kpis: ReportSummaryKPIs;
  projectDistribution: ProjectTimeBreakdown[];
  taskStatuses: TaskStatusBreakdown[];
  chartData: DailyChartItem[];
  logs: DetailedReportLog[];
}

export interface TeamReport {
  kpis: ReportSummaryKPIs;
  projectDistribution: ProjectTimeBreakdown[];
  taskStatuses: TaskStatusBreakdown[];
  chartData: DailyChartItem[];
  workload: MemberWorkloadItem[];
  logs: DetailedReportLog[];
}

export class ReportService {
  /**
   * Reusable authorization verification helper for Team Reports.
   */
  async verifyReportAuthority(
    requestingUserId: string,
    orgId: string,
    teamId: string,
    tx: DBInstance = db
  ): Promise<void> {
    z.string().parse(requestingUserId);
    z.string().parse(orgId);
    z.string().parse(teamId);

    // 1. Check Global Admin
    const userTable = tables.user;
    const [userRecord] = await tx
      .select({ is_admin: userTable.is_admin })
      .from(userTable)
      .where(eq(userTable.id, requestingUserId))
      .limit(1);

    if (userRecord?.is_admin) {
      return; // Global admins have full access
    }

    // 2. Check Organization Admin
    const memberTable = tables.member;
    const [orgMembership] = await tx
      .select({ role: memberTable.role })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.organizationId, orgId),
          eq(memberTable.userId, requestingUserId)
        )
      )
      .limit(1);

    if (orgMembership?.role === "admin" || orgMembership?.role === "owner" || orgMembership?.role === "system_admin") {
      return; // Organization admins/owners have full access
    }

    // 3. Check Team Leader status
    const teamMemberTable = tables.teamMembers;
    const [teamMembership] = await tx
      .select({ role: teamMemberTable.role })
      .from(teamMemberTable)
      .where(
        and(
          eq(teamMemberTable.team_id, teamId),
          eq(teamMemberTable.user_id, requestingUserId),
          isNull(teamMemberTable.deleted_at)
        )
      )
      .limit(1);

    if (teamMembership?.role === "leader") {
      return; // Team leaders are authorized
    }

    throw new Error("Security Error: Unauthorized to generate reports for this team");
  }

  /**
   * Helper: Calculates basic KPIs from a set of hydrated time logs.
   */
  computeSummaryKPIs(logs: DetailedReportLog[], totalSeconds: number): ReportSummaryKPIs {
    const totalHours = calculateDurationHours(totalSeconds);
    const totalSessions = logs.length;
    const averageSessionHours = totalSessions > 0 ? totalHours / totalSessions : 0;
    const activeProjects = new Set(logs.map((l) => l.projectName).filter(Boolean)).size;

    return {
      totalHours: Number(totalHours.toFixed(2)),
      totalSessions,
      averageSessionHours: Number(averageSessionHours.toFixed(2)),
      activeProjects,
    };
  }

  /**
   * Helper: Aggregates hours spent on each Project.
   */
  aggregateProjectDistribution(logs: DetailedReportLog[]): ProjectTimeBreakdown[] {
    const projectMap = new Map<string | null, { name: string; seconds: number }>();
    let totalSeconds = 0;

    for (const log of logs) {
      const duration = log.duration;
      totalSeconds += duration;

      const current = projectMap.get(log.projectName) || { name: log.projectName || "No Project", seconds: 0 };
      current.seconds += duration;
      projectMap.set(log.projectName, current);
    }

    const distribution: ProjectTimeBreakdown[] = [];
    for (const [projName, data] of projectMap.entries()) {
      const hours = calculateDurationHours(data.seconds);
      const percentage = totalSeconds > 0 ? (data.seconds / totalSeconds) * 100 : 0;
      distribution.push({
        projectId: null, // Scoped by names for simplicity on hydration
        projectName: projName || "No Project",
        hours: Number(hours.toFixed(2)),
        percentage: Number(percentage.toFixed(2)),
      });
    }

    return distribution.sort((a, b) => b.hours - a.hours);
  }

  /**
   * Helper: Aggregates task statuses from tasks linked to logs.
   */
  aggregateTaskStatuses(tasks: { id: string; status: string }[]): TaskStatusBreakdown[] {
    const statusMap = new Map<string, number>();

    for (const task of tasks) {
      const current = statusMap.get(task.status) || 0;
      statusMap.set(task.status, current + 1);
    }

    const breakdowns: TaskStatusBreakdown[] = [];
    for (const [status, count] of statusMap.entries()) {
      breakdowns.push({ status, count });
    }
    return breakdowns;
  }

  /**
   * Helper: Builds daily buckets for chart displays.
   */
  buildDailyChartData(logs: DetailedReportLog[], startDateStr?: string, endDateStr?: string): DailyChartItem[] {
    const dayMap = new Map<string, number>();

    // Pre-populate date range if provided to prevent empty gaps
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dayMap.set(d.toISOString().split("T")[0], 0);
      }
    }

    for (const log of logs) {
      const dateStr = new Date(log.startTime).toISOString().split("T")[0];
      const durationHours = calculateDurationHours(log.duration);

      const current = dayMap.get(dateStr) || 0;
      dayMap.set(dateStr, current + durationHours);
    }

    const chartData: DailyChartItem[] = [];
    for (const [date, hours] of dayMap.entries()) {
      chartData.push({
        date,
        hours: Number(hours.toFixed(2)),
      });
    }
    return chartData.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Hydrates raw database time logs with user, project, linked tasks, and evidence files.
   */
  private async hydrateLogs(
    rawLogs: Array<TimeLog | TimeLogSqlite>,
    tx: DBInstance
  ): Promise<{ logs: DetailedReportLog[]; tasks: Array<{ id: string; status: string }> }> {
    if (rawLogs.length === 0) {
      return { logs: [], tasks: [] };
    }

    const logIds = rawLogs.map((l) => l.id);
    const userIds = Array.from(new Set(rawLogs.map((l) => l.user_id)));

    // Fetch user details
    const userTable = tables.user;
    const users = await tx
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.id, userIds));
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Fetch projects
    const projectTable = tables.projects;
    const projectIds = Array.from(new Set(rawLogs.map((l) => l.project_id).filter((id): id is string => !!id)));
    let projectMap = new Map<string, string>();
    if (projectIds.length > 0) {
      const projects = await tx
        .select({ id: projectTable.id, name: projectTable.name })
        .from(projectTable)
        .where(inArray(projectTable.id, projectIds));
      projectMap = new Map(projects.map((p) => [p.id, p.name]));
    }

    const hydration = await TimeLogHydrator.hydrateRelations(logIds, tx);

    const allTaskDetails: { id: string; status: string }[] = [];
    const hydrated: DetailedReportLog[] = rawLogs.map((log) => {
      const usr = userMap.get(log.user_id) || { name: "Unknown User", email: "" };
      const rel = hydration[log.id] || { tasks: [], evidence: [] };

      for (const t of rel.tasks) {
        allTaskDetails.push({ id: t.id, status: t.status });
      }

      return {
        id: log.id,
        userId: log.user_id,
        userName: usr.name,
        userEmail: usr.email,
        title: log.title || "Untitled Task",
        description: log.description,
        startTime: log.start_time,
        endTime: log.end_time,
        duration: log.duration,
        projectName: log.project_id ? projectMap.get(log.project_id) || null : null,
        taskTitles: rel.tasks.map((t) => t.title),
        evidenceUrls: rel.evidence.map((e) => e.file_url),
      };
    });

    return { logs: hydrated, tasks: allTaskDetails };
  }

  /**
   * Generates type-safe Personal Report.
   */
  async getPersonalReport(
    userId: string,
    orgId: string,
    teamIdFilter: string | null | "all",
    startDateStr?: string,
    endDateStr?: string,
    tx: DBInstance = db
  ): Promise<PersonalReport> {
    z.string().parse(userId);
    z.string().parse(orgId);

    const logTable = tables.timeLogs;
    const conditions = [
      eq(logTable.user_id, userId),
      eq(logTable.organization_id, orgId),
      isNull(logTable.deleted_at),
    ];

    if (teamIdFilter === null) {
      conditions.push(isNull(logTable.team_id));
    } else if (teamIdFilter !== "all" && teamIdFilter) {
      conditions.push(eq(logTable.team_id, teamIdFilter));
    }

    if (startDateStr) {
      conditions.push(gte(logTable.start_time, new Date(startDateStr)));
    }
    if (endDateStr) {
      const endLimit = new Date(endDateStr);
      endLimit.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(logTable.end_time, endLimit));
    }

    const rawLogs = await tx
      .select()
      .from(logTable)
      .where(and(...conditions))
      .orderBy(desc(logTable.start_time));

    const [durationResult] = await tx
      .select({ totalSeconds: sum(logTable.duration) })
      .from(logTable)
      .where(and(...conditions));
    const totalSeconds = Number(durationResult?.totalSeconds || 0);

    const { logs, tasks } = await this.hydrateLogs(rawLogs, tx);

    return {
      kpis: this.computeSummaryKPIs(logs, totalSeconds),
      projectDistribution: this.aggregateProjectDistribution(logs),
      taskStatuses: this.aggregateTaskStatuses(tasks),
      chartData: this.buildDailyChartData(logs, startDateStr, endDateStr),
      logs,
    };
  }

  /**
   * Generates type-safe Team Report.
   */
  async getTeamReport(
    requestingUserId: string,
    orgId: string,
    teamId: string,
    startDateStr?: string,
    endDateStr?: string,
    tx: DBInstance = db
  ): Promise<TeamReport> {
    // 1. Authorization
    await this.verifyReportAuthority(requestingUserId, orgId, teamId, tx);

    const logTable = tables.timeLogs;
    const conditions = [
      eq(logTable.team_id, teamId),
      eq(logTable.organization_id, orgId),
      isNull(logTable.deleted_at),
    ];

    if (startDateStr) {
      conditions.push(gte(logTable.start_time, new Date(startDateStr)));
    }
    if (endDateStr) {
      const endLimit = new Date(endDateStr);
      endLimit.setUTCHours(23, 59, 59, 999);
      conditions.push(lte(logTable.end_time, endLimit));
    }

    const rawLogs = await tx
      .select()
      .from(logTable)
      .where(and(...conditions))
      .orderBy(desc(logTable.start_time));

    const [durationResult] = await tx
      .select({ totalSeconds: sum(logTable.duration) })
      .from(logTable)
      .where(and(...conditions));
    const totalSeconds = Number(durationResult?.totalSeconds || 0);

    const { logs, tasks } = await this.hydrateLogs(rawLogs, tx);

    // 2. Aggregate workload distribution per team member
    const workloadMap = new Map<string, { name: string; email: string; seconds: number; sessions: number; tasks: Set<string> }>();

    for (const log of logs) {
      const current = workloadMap.get(log.userId) || {
        name: log.userName,
        email: log.userEmail,
        seconds: 0,
        sessions: 0,
        tasks: new Set<string>(),
      };

      current.seconds += log.duration;
      current.sessions += 1;
      current.tasks.add(log.title);
      workloadMap.set(log.userId, current);
    }

    const workloadList: MemberWorkloadItem[] = [];
    for (const [userId, w] of workloadMap.entries()) {
      const memberHours = calculateDurationHours(w.seconds);
      workloadList.push({
        userId,
        userName: w.name,
        userEmail: w.email,
        totalHours: Number(memberHours.toFixed(2)),
        totalSessions: w.sessions,
        averageSessionHours: w.sessions > 0 ? Number((memberHours / w.sessions).toFixed(2)) : 0,
        tasksCompleted: w.tasks.size,
      });
    }

    return {
      kpis: this.computeSummaryKPIs(logs, totalSeconds),
      projectDistribution: this.aggregateProjectDistribution(logs),
      taskStatuses: this.aggregateTaskStatuses(tasks),
      chartData: this.buildDailyChartData(logs, startDateStr, endDateStr),
      workload: workloadList.sort((a, b) => b.totalHours - a.totalHours),
      logs,
    };
  }
}
