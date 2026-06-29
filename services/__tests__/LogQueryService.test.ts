import { describe, test, expect, beforeEach } from "bun:test";
import { LogService } from "../core/LogService";
import { LogQueryService } from "../core/LogQueryService";
import { AuditService } from "../core/AuditService";
import { TaskService } from "../core/TaskService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, organizationSqlite, projectsSqlite, tasksSqlite, teamsSqlite, teamMembersSqlite } from "@/db/schema";
import { StorageService } from "@/services/integrations/StorageService";
import { MockProvider } from "./StorageService.test";

describe("LogQueryService", () => {
  let auditService: AuditService;
  let taskService: TaskService;
  let storageService: StorageService;
  let logService: LogService;
  let logQueryService: LogQueryService;

  const testUserId = "user-123";
  const testOrgId = "org-123";
  const testTaskId = "task-123";

  beforeEach(async () => {
    await clearDatabase();

    const cloudinaryMock = new MockProvider("cloudinary");
    const supabaseMock = new MockProvider("supabase");

    auditService = new AuditService();
    taskService = new TaskService();
    storageService = new StorageService(cloudinaryMock, supabaseMock);
    logService = new LogService(auditService, taskService, storageService);
    logQueryService = new LogQueryService();

    const now = new Date();
    await db.insert(organizationSqlite).values({
      id: testOrgId,
      name: "Test Org",
      slug: "test-org",
      createdAt: now,
    });

    await db.insert(userSqlite).values({
      id: testUserId,
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(projectsSqlite).values([
      {
        id: "project-1",
        organization_id: testOrgId,
        name: "Project 1",
        created_at: now,
        updated_at: now,
      },
      {
        id: "project-A",
        organization_id: testOrgId,
        name: "Project A",
        created_at: now,
        updated_at: now,
      }
    ]);

    await db.insert(tasksSqlite).values({
      id: testTaskId,
      title: "Clean Kitchen",
      status: "todo",
      user_id: testUserId,
      organization_id: testOrgId,
      created_at: now,
      updated_at: now,
    });
  });

  test("getUserLogs should apply filters correctly", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      projectId: "project-A",
      startTime,
      endTime,
      description: "Project A work",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    const logs = await logQueryService.getUserLogs(testUserId, { projectId: "project-A" });
    expect(logs.length).toBe(1);
    expect(logs[0].project_id).toBe("project-A");
  });

  test("getTeamTimeline should return chronological logs with hydrated details", async () => {
    const now = new Date();
    const startTime1 = new Date(now.getTime() - 7200000);
    const endTime1 = new Date(now.getTime() - 3600000);
    const startTime2 = new Date(now.getTime() - 14400000);
    const endTime2 = new Date(now.getTime() - 10800000);

    const teamId = "team-123";
    const user2Id = "user-456";

    await db.insert(userSqlite).values({
      id: user2Id,
      name: "Bob",
      email: "bob@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(teamsSqlite).values({
      id: teamId,
      organization_id: testOrgId,
      name: "Team ABC",
      created_at: now,
      updated_at: now,
    });

    await db.insert(teamMembersSqlite).values([
      { id: "team-m-1", team_id: teamId, user_id: testUserId, role: "leader", created_at: now, updated_at: now },
      { id: "team-m-2", team_id: teamId, user_id: user2Id, role: "member", created_at: now, updated_at: now },
    ]);

    const log1 = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      teamId,
      startTime: startTime1,
      endTime: endTime1,
      description: "Alice work",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k1", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      taskIds: [testTaskId],
    });

    const log2 = await logService.createLog({
      userId: user2Id,
      organizationId: testOrgId,
      teamId,
      startTime: startTime2,
      endTime: endTime2,
      description: "Bob work",
      evidence: [{ fileUrl: "https://x.com/b.png", fileKey: "k2", fileName: "b.png", fileSize: 100, mimeType: "image/png" }],
    });

    const timeline = await logQueryService.getTeamTimeline(teamId);
    expect(timeline.length).toBe(2);
    expect(timeline[0].id).toBe(log1.id);
    expect(timeline[0].userName).toBe("Alice");
    expect(timeline[0].tasks.map((t) => t.id)).toContain(testTaskId);
    expect((timeline[0].evidence[0] as any).file_name).toBe("a.png");

    expect(timeline[1].id).toBe(log2.id);
    expect(timeline[1].userName).toBe("Bob");
    expect((timeline[1].evidence[0] as any).file_name).toBe("b.png");
  });
});
