import { describe, test, expect, beforeEach } from "bun:test";
import { LogService } from "../core/LogService";
import { TimerService } from "../core/TimerService";
import { AuditService } from "../core/AuditService";
import { TaskService } from "../core/TaskService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, organizationSqlite, projectsSqlite, tasksSqlite, timersSqlite } from "@/db/schema";
import { StorageService } from "@/services/integrations/StorageService";
import { MockProvider } from "./StorageService.test";

describe("TimerService", () => {
  let auditService: AuditService;
  let taskService: TaskService;
  let storageService: StorageService;
  let logService: LogService;
  let timerService: TimerService;

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
    timerService = new TimerService(logService, auditService);

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

  test("startTimer should start timer if user active and no timer running", async () => {
    const timer = await timerService.startTimer(testUserId, "project-1", "Timer description");
    expect(timer).toBeDefined();
    expect(timer.user_id).toBe(testUserId);
    expect(timer.description).toBe("Timer description");
    expect(timer.project_id).toBe("project-1");

    const active = await timerService.getRunningTimer(testUserId);
    expect(active).not.toBeNull();
    expect(active!.description).toBe("Timer description");
  });

  test("startTimer should throw error if timer already active", async () => {
    await timerService.startTimer(testUserId, null, "First timer");

    expect(
      timerService.startTimer(testUserId, null, "Second timer")
    ).rejects.toThrow("Validation Error: An active timer is already running for this user");
  });

  test("stopTimer should stop active timer and create a time log", async () => {
    const startTime = new Date(Date.now() - 7200000);
    await db.insert(timersSqlite).values({
      user_id: testUserId,
      start_time: startTime,
      description: "Timer session",
      project_id: "project-1",
      created_at: startTime,
    });

    const stoppedLog = await timerService.stopTimer(
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
    expect(stoppedLog.duration).toBeGreaterThanOrEqual(7200);

    const active = await timerService.getRunningTimer(testUserId);
    expect(active).toBeNull();
  });

  test("stopTimer should throw if no active timer is running", async () => {
    expect(
      timerService.stopTimer(
        testUserId,
        testOrgId,
        null,
        [],
        [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }]
      )
    ).rejects.toThrow("Validation Error: No active running timer found for this user");
  });

  test("discardTimer should remove active running timer", async () => {
    const startTime = new Date();
    await db.insert(timersSqlite).values({
      user_id: testUserId,
      start_time: startTime,
      description: "Timer to discard",
      project_id: "project-1",
      created_at: startTime,
    });

    const discarded = await timerService.discardTimer(testUserId);
    expect(discarded).toBe(true);

    const active = await timerService.getRunningTimer(testUserId);
    expect(active).toBeNull();
  });

  test("discardTimer should throw if no timer is running", async () => {
    expect(
      timerService.discardTimer(testUserId)
    ).rejects.toThrow("Validation Error: No active running timer found for this user");
  });
});
