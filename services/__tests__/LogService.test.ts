import { describe, test, expect, beforeEach } from "bun:test";
import { LogService } from "../LogService";
import { AuditService } from "../AuditService";
import { NotificationService } from "../NotificationService";
import { TaskService } from "../TaskService";
import { UserService } from "../UserService";
import { OrganizationService } from "../OrganizationService";
import { TeamService } from "../TeamService";
import { clearDatabase } from "./db-helper";
import { db } from "@/db";
import { userSqlite, tasksSqlite, timeLogsSqlite, timersSqlite, documentEvidencesSqlite, organizationSqlite, projectsSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("LogService", () => {
  let auditService: AuditService;
  let notificationService: NotificationService;
  let taskService: TaskService;
  let organizationService: OrganizationService;
  let teamService: TeamService;
  let userService: UserService;
  let logService: LogService;

  const testUserId = "user-123";
  const testOrgId = "org-123";
  const testTaskId = "task-123";

  beforeEach(async () => {
    await clearDatabase();

    auditService = new AuditService();
    notificationService = new NotificationService();
    taskService = new TaskService();
    organizationService = new OrganizationService();
    teamService = new TeamService();
    userService = new UserService(organizationService, teamService);
    logService = new LogService(
      auditService,
      notificationService,
      taskService,
      userService
    );

    // Seed base organization, user, project and task to satisfy FKs
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

  // --- 1. OVERLAP AND VALIDATION TESTS ---
  test("createLog should throw error if startTime >= endTime", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 3600000);

    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime: future,
        endTime: now,
        description: "Invalid times",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: Start time must be before end time");
  });

  test("createLog should throw error if endTime is in the future", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 3600000); // 1 hour in future

    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime: now,
        endTime: future,
        description: "Future log",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: End time cannot be in the future");
  });

  test("createLog should throw error if user does not exist", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    expect(
      logService.createLog({
        userId: "non-existent",
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "Valid log",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: User with ID non-existent does not exist");
  });

  test("createLog should validate evidence existence, file size and mime types", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    // Empty evidence
    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "No evidence",
        evidence: [],
      })
    ).rejects.toThrow("Validation Error: At least one Document Evidence file is required");

    // Size limit exceeded (> 10MB)
    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "Huge file",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 11 * 1024 * 1024, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: File a.png exceeds max size limit of 10MB");

    // Unsupported mime type
    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "PDF file",
        evidence: [{ fileUrl: "https://x.com/a.pdf", fileKey: "k", fileName: "a.pdf", fileSize: 100, mimeType: "application/pdf" }],
      })
    ).rejects.toThrow("Validation Error: File a.pdf has unsupported type. Images only.");
  });

  test("createLog should throw error if task does not exist", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "Log with fake task",
        taskIds: ["fake-task"],
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: Task with ID fake-task does not exist or is deleted");
  });

  test("createLog should throw error if overlapping with existing log", async () => {
    const baseStart = new Date(Date.now() - 7200000);
    const baseEnd = new Date(Date.now() - 3600000);

    // Create a base log
    const baseLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: baseStart,
      endTime: baseEnd,
      description: "Base session",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });
    expect(baseLog).toBeDefined();

    // Overlap: exact match
    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime: baseStart,
        endTime: baseEnd,
        description: "Exact overlap",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: Time log overlaps with an existing active log");

    // Overlap: starting inside window
    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime: new Date(baseStart.getTime() + 1800000),
        endTime: new Date(baseEnd.getTime() + 1800000),
        description: "Start overlap",
        evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      })
    ).rejects.toThrow("Validation Error: Time log overlaps with an existing active log");
  });

  test("createLog should succeed with valid parameters", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    const log = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime,
      endTime,
      description: "Successful work",
      taskIds: [testTaskId],
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.title).toBe("Untitled Task");

    // Fetch and check relations
    const detailed = await logService.getLogById(log.id);
    expect(detailed).toBeDefined();
    expect(detailed.tasks.length).toBe(1);
    expect(detailed.tasks[0]).toBe(testTaskId);
    expect(detailed.evidence.length).toBe(1);
    expect(detailed.evidence[0].file_name).toBe("a.png");
  });

  // --- 2. TIMER TESTS ---
  test("startTimer should start timer if user active and no timer running", async () => {
    const timer = await logService.startTimer(testUserId, "project-1", "Timer description");
    expect(timer).toBeDefined();
    expect(timer.user_id).toBe(testUserId);
    expect(timer.description).toBe("Timer description");
    expect(timer.project_id).toBe("project-1");

    const active = await logService.getRunningTimer(testUserId);
    expect(active).toBeDefined();
    expect(active.description).toBe("Timer description");
  });

  test("startTimer should throw error if timer already active", async () => {
    await logService.startTimer(testUserId, null, "First timer");

    expect(
      logService.startTimer(testUserId, null, "Second timer")
    ).rejects.toThrow("Validation Error: An active timer is already running for this user");
  });

  test("stopTimer should stop active timer and create a time log", async () => {
    // Seed active timer in the past (e.g. 2 hours ago)
    const startTime = new Date(Date.now() - 7200000);
    await db.insert(timersSqlite).values({
      user_id: testUserId,
      start_time: startTime,
      description: "Timer session",
      project_id: "project-1",
      created_at: startTime,
    });

    const stoppedLog = await logService.stopTimer(
      testUserId,
      testOrgId,
      null,
      [testTaskId],
      [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
      "Custom stopping description"
    );

    expect(stoppedLog).toBeDefined();
    expect(stoppedLog.title).toBe("Custom stopping description");
    expect(stoppedLog.project_id).toBe("project-1");

    // Verify timer deleted
    const active = await logService.getRunningTimer(testUserId);
    expect(active).toBeNull();
  });

  test("stopTimer should throw if no active timer is running", async () => {
    expect(
      logService.stopTimer(
        testUserId,
        testOrgId,
        null,
        [],
        [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }]
      )
    ).rejects.toThrow("Validation Error: No active running timer found for this user");
  });

  // --- 3. CRUD UPDATE & DELETE TESTS ---
  test("updateLog should modify properties successfully", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    const log = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime,
      endTime,
      description: "Old description",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    const updated = await logService.updateLog(log.id, testUserId, {
      description: "New description",
      title: "New title",
    });

    expect(updated).toBeDefined();
    expect(updated.description).toBe("New description");
    expect(updated.title).toBe("New title");
  });

  test("deleteLog should soft-delete log", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    const log = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime,
      endTime,
      description: "To delete",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    const res = await logService.deleteLog(log.id, testUserId);
    expect(res).toBe(true);

    const fetched = await logService.getLogById(log.id);
    expect(fetched).toBeNull();
  });

  // --- 4. RETRIEVAL & FILTER TESTS ---
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

    const logs = await logService.getUserLogs(testUserId, { projectId: "project-A" });
    expect(logs.length).toBe(1);
    expect(logs[0].project_id).toBe("project-A");
  });

  // --- 5. DISCARD TIMER & TIMELINE TESTS ---
  test("discardTimer should remove active running timer", async () => {
    const startTime = new Date();
    await db.insert(timersSqlite).values({
      user_id: testUserId,
      start_time: startTime,
      description: "Timer to discard",
      project_id: "project-1",
      created_at: startTime,
    });

    const discarded = await logService.discardTimer(testUserId);
    expect(discarded).toBe(true);

    const active = await logService.getRunningTimer(testUserId);
    expect(active).toBeNull();
  });

  test("discardTimer should throw if no timer is running", async () => {
    expect(
      logService.discardTimer(testUserId)
    ).rejects.toThrow("Validation Error: No active running timer found for this user");
  });

  test("getTeamTimeline should return chronological logs with hydrated details", async () => {
    const now = new Date();
    const startTime1 = new Date(now.getTime() - 7200000);
    const endTime1 = new Date(now.getTime() - 3600000);
    const startTime2 = new Date(now.getTime() - 14400000);
    const endTime2 = new Date(now.getTime() - 10800000);

    // Create logs for two members
    const user2Id = "user-456";
    await db.insert(userSqlite).values({
      id: user2Id,
      name: "Bob",
      email: "bob@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    // Add both to a team
    const teamId = "team-abc";
    const schema = require("@/db/schema");
    const teamsSqliteTable = schema.teamsSqlite;
    const teamMembersSqliteTable = schema.teamMembersSqlite;
    
    // Seed team
    await db.insert(teamsSqliteTable).values({
      id: teamId,
      organization_id: testOrgId,
      name: "Team ABC",
      created_at: now,
      updated_at: now,
    });

    await db.insert(teamMembersSqliteTable).values([
      { id: "team-m-1", team_id: teamId, user_id: testUserId, role: "leader", created_at: now, updated_at: now },
      { id: "team-m-2", team_id: teamId, user_id: user2Id, role: "member", created_at: now, updated_at: now },
    ]);

    // Create log 1 (Alice)
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

    // Create log 2 (Bob)
    const log2 = await logService.createLog({
      userId: user2Id,
      organizationId: testOrgId,
      teamId,
      startTime: startTime2,
      endTime: endTime2,
      description: "Bob work",
      evidence: [{ fileUrl: "https://x.com/b.png", fileKey: "k2", fileName: "b.png", fileSize: 100, mimeType: "image/png" }],
    });

    const timeline = await logService.getTeamTimeline(teamId);
    // Chronological sort: log 1 is newer than log 2, so log 1 should be first
    expect(timeline.length).toBe(2);
    expect(timeline[0].id).toBe(log1.id);
    expect(timeline[0].userName).toBe("Alice");
    expect(timeline[0].tasks).toContain(testTaskId);
    expect(timeline[0].evidence[0].file_name).toBe("a.png");

    expect(timeline[1].id).toBe(log2.id);
    expect(timeline[1].userName).toBe("Bob");
    expect(timeline[1].evidence[0].file_name).toBe("b.png");
  });
});
