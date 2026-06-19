import { describe, test, expect, beforeEach } from "bun:test";
import { ReportService } from "../core/ReportService";
import { clearDatabase, db } from "./db-helper";
import {
  userSqlite,
  memberSqlite,
  teamMembersSqlite,
  teamsSqlite,
  projectsSqlite,
  tasksSqlite,
  timeLogsSqlite,
  timeLogTasksSqlite,
  documentEvidencesSqlite,
} from "@/db/schema";

describe("ReportService", () => {
  const reportService = new ReportService();

  beforeEach(async () => {
    await clearDatabase();
  });

  describe("Helper Functions Unit Tests", () => {
    test("computeSummaryKPIs calculates correct hours, active days, average, and evidence", () => {
      const logs = [
        {
          startTime: new Date("2026-06-01T08:00:00Z"),
          endTime: new Date("2026-06-01T12:00:00Z"), // 4 hrs
          duration: 4 * 3600,
          projectName: "Project Alpha",
          evidenceUrls: ["url1", "url2"],
        },
        {
          startTime: new Date("2026-06-01T13:00:00Z"),
          endTime: new Date("2026-06-01T15:00:00Z"), // 2 hrs
          duration: 2 * 3600,
          projectName: "Project Alpha",
          evidenceUrls: ["url3"],
        },
        {
          startTime: new Date("2026-06-02T09:00:00Z"),
          endTime: new Date("2026-06-02T12:00:00Z"), // 3 hrs
          duration: 3 * 3600,
          projectName: null,
          evidenceUrls: [],
        },
      ];

      const kpis = reportService.computeSummaryKPIs(logs as any, 9 * 3600);
      expect(kpis.totalHours).toBe(9);
      expect(kpis.totalSessions).toBe(3);
      expect(kpis.averageSessionHours).toBe(3);
      expect(kpis.activeProjects).toBe(1);
    });

    test("aggregateProjectDistribution groups hours correctly and calculates percentages", () => {
      const logs = [
        {
          startTime: new Date("2026-06-01T08:00:00Z"),
          endTime: new Date("2026-06-01T10:00:00Z"), // 2 hrs
          duration: 2 * 3600,
          projectName: "Project Alpha",
        },
        {
          startTime: new Date("2026-06-01T11:00:00Z"),
          endTime: new Date("2026-06-01T14:00:00Z"), // 3 hrs
          duration: 3 * 3600,
          projectName: "Project Alpha",
        },
        {
          startTime: new Date("2026-06-01T15:00:00Z"),
          endTime: new Date("2026-06-01T20:00:00Z"), // 5 hrs
          duration: 5 * 3600,
          projectName: "Project Beta",
        },
      ];

      const dist = reportService.aggregateProjectDistribution(logs as any);
      expect(dist.length).toBe(2);

      const alpha = dist.find((p) => p.projectName === "Project Alpha");
      const beta = dist.find((p) => p.projectName === "Project Beta");

      expect(alpha).toBeDefined();
      expect(alpha!.hours).toBe(5);
      expect(alpha!.percentage).toBe(50);

      expect(beta).toBeDefined();
      expect(beta!.hours).toBe(5);
      expect(beta!.percentage).toBe(50);
    });

    test("aggregateTaskStatuses counts task statuses correctly", () => {
      const tasks = [
        { id: "1", status: "todo" },
        { id: "2", status: "in_progress" },
        { id: "3", status: "todo" },
        { id: "4", status: "done" },
      ];

      const breakdowns = reportService.aggregateTaskStatuses(tasks);
      expect(breakdowns.length).toBe(3);

      const todo = breakdowns.find((b) => b.status === "todo");
      const inProgress = breakdowns.find((b) => b.status === "in_progress");
      const done = breakdowns.find((b) => b.status === "done");

      expect(todo!.count).toBe(2);
      expect(inProgress!.count).toBe(1);
      expect(done!.count).toBe(1);
    });

    test("buildDailyChartData creates sorted daily hour buckets", () => {
      const logs = [
        {
          startTime: new Date("2026-06-01T08:00:00Z"),
          endTime: new Date("2026-06-01T12:00:00Z"), // 4 hrs
          duration: 4 * 3600,
        },
        {
          startTime: new Date("2026-06-03T10:00:00Z"),
          endTime: new Date("2026-06-03T15:00:00Z"), // 5 hrs
          duration: 5 * 3600,
        },
      ];

      const chart = reportService.buildDailyChartData(logs as any, "2026-06-01", "2026-06-03");
      expect(chart.length).toBe(3); // 2026-06-01, 2026-06-02, 2026-06-03

      expect(chart[0].date).toBe("2026-06-01");
      expect(chart[0].hours).toBe(4);

      expect(chart[1].date).toBe("2026-06-02");
      expect(chart[1].hours).toBe(0);

      expect(chart[2].date).toBe("2026-06-03");
      expect(chart[2].hours).toBe(5);
    });
  });

  describe("Integration Tests", () => {
    beforeEach(async () => {
      // Setup default Organization and users
      await db.insert(userSqlite).values([
        {
          id: "user-admin",
          name: "Global Admin User",
          email: "admin@aika.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          is_admin: true,
        },
        {
          id: "user-leader",
          name: "Team Leader User",
          email: "leader@aika.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          is_admin: false,
        },
        {
          id: "user-member",
          name: "Team Member User",
          email: "member@aika.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          is_admin: false,
        },
      ]);

      await db.insert(memberSqlite).values([
        {
          id: "m-admin",
          organizationId: "org-1",
          userId: "user-admin",
          role: "admin",
          createdAt: new Date(),
        },
        {
          id: "m-leader",
          organizationId: "org-1",
          userId: "user-leader",
          role: "member",
          createdAt: new Date(),
        },
        {
          id: "m-member",
          organizationId: "org-1",
          userId: "user-member",
          role: "member",
          createdAt: new Date(),
        },
      ]);

      await db.insert(teamsSqlite).values({
        id: "team-1",
        organization_id: "org-1",
        name: "Team Engineering",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.insert(teamMembersSqlite).values([
        {
          id: "tm-1",
          team_id: "team-1",
          user_id: "user-leader",
          role: "leader",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "tm-2",
          team_id: "team-1",
          user_id: "user-member",
          role: "member",
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    });

    test("verifyReportAuthority rules enforced", async () => {
      // 1. Global Admin should succeed
      await expect(
        reportService.verifyReportAuthority("user-admin", "org-1", "team-1")
      ).resolves.toBeUndefined();

      // 2. Team Leader should succeed
      await expect(
        reportService.verifyReportAuthority("user-leader", "org-1", "team-1")
      ).resolves.toBeUndefined();

      // 3. Simple Team Member should fail
      await expect(
        reportService.verifyReportAuthority("user-member", "org-1", "team-1")
      ).rejects.toThrow();
    });

    test("getPersonalReport retrieves personal data and performs soft delete checks", async () => {
      // Insert some projects, tasks, logs, evidence
      await db.insert(projectsSqlite).values({
        id: "proj-1",
        organization_id: "org-1",
        team_id: "team-1",
        name: "Aika Alpha Project",
        created_at: new Date(),
        updated_at: new Date(),
      });

      await db.insert(tasksSqlite).values([
        {
          id: "task-1",
          title: "Build tRPC services",
          status: "done",
          user_id: "user-member",
          team_id: "team-1",
          organization_id: "org-1",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "task-2",
          title: "Soft deleted task",
          status: "todo",
          user_id: "user-member",
          team_id: "team-1",
          organization_id: "org-1",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: new Date(), // Soft deleted
        },
      ]);

      await db.insert(timeLogsSqlite).values([
        {
          id: "log-1",
          user_id: "user-member",
          team_id: "team-1",
          organization_id: "org-1",
          project_id: "proj-1",
          start_time: new Date("2026-06-01T09:00:00Z"),
          end_time: new Date("2026-06-01T12:00:00Z"), // 3 hrs
          duration: 3 * 3600,
          title: "Worked on services",
          description: "Implemented ReportService",
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: "log-deleted",
          user_id: "user-member",
          team_id: "team-1",
          organization_id: "org-1",
          project_id: "proj-1",
          start_time: new Date("2026-06-01T13:00:00Z"),
          end_time: new Date("2026-06-01T15:00:00Z"),
          duration: 2 * 3600,
          title: "Soft deleted log",
          description: "This is soft-deleted",
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: new Date(), // Soft deleted
        },
      ]);

      await db.insert(timeLogTasksSqlite).values([
        { time_log_id: "log-1", task_id: "task-1" },
        { time_log_id: "log-1", task_id: "task-2" }, // Soft deleted task
      ]);

      await db.insert(documentEvidencesSqlite).values({
        id: "ev-1",
        time_log_id: "log-1",
        file_url: "https://aika.com/evidence-1.png",
        file_key: "evidence-1",
        file_name: "evidence-1.png",
        file_size: 1024,
        mime_type: "image/png",
        created_at: new Date(),
      });

      const report = await reportService.getPersonalReport(
        "user-member",
        "org-1",
        "team-1",
        "2026-06-01",
        "2026-06-02"
      );

      // Verify KPI calculations
      expect(report.kpis.totalHours).toBe(3);
      expect(report.kpis.totalSessions).toBe(1);
      expect(report.kpis.averageSessionHours).toBe(3);
      expect(report.kpis.activeProjects).toBe(1);

      // Verify Project Distribution
      expect(report.projectDistribution.length).toBe(1);
      expect(report.projectDistribution[0].projectName).toBe("Aika Alpha Project");
      expect(report.projectDistribution[0].hours).toBe(3);

      // Verify Task Breakdown (excluding deleted_at = task-2 should NOT count)
      expect(report.taskStatuses.length).toBe(1);
      expect(report.taskStatuses[0].status).toBe("done");
      expect(report.taskStatuses[0].count).toBe(1);

      // Verify hydrated detailed log list
      expect(report.logs.length).toBe(1);
      expect(report.logs[0].id).toBe("log-1");
      expect(report.logs[0].taskTitles.length).toBe(1);
      expect(report.logs[0].taskTitles[0]).toBe("Build tRPC services");
      expect(report.logs[0].evidenceUrls.length).toBe(1);
      expect(report.logs[0].evidenceUrls[0]).toBe("https://aika.com/evidence-1.png");
    });
  });
});
