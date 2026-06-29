import { describe, test, expect, beforeEach } from "bun:test";
import { LogService } from "../core/LogService";
import { LogQueryService } from "../core/LogQueryService";
import { AuditService } from "../core/AuditService";
import { TaskService } from "../core/TaskService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, tasksSqlite, organizationSqlite, projectsSqlite } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { StorageService } from "@/services/integrations/StorageService";
import { MockProvider } from "./StorageService.test";
import { ImportedLogInput } from "../import-export/types";

describe("LogService", () => {
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
    const future = new Date(now.getTime() + 3600000);

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
    await db.run(sql`PRAGMA foreign_keys = ON`);

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
    ).rejects.toThrow("Failed query");
  });

  test("createLog should validate evidence size and mime types", async () => {
    const startTime = new Date(Date.now() - 7200000);
    const endTime = new Date(Date.now() - 3600000);

    const noEvidenceResult = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime,
      endTime,
      description: "No evidence",
      evidence: [],
    });

    expect(noEvidenceResult).not.rejects;

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

    expect(
      logService.createLog({
        userId: testUserId,
        organizationId: testOrgId,
        startTime,
        endTime,
        description: "Unsupported file",
        evidence: [{ fileUrl: "https://x.com/a.exe", fileKey: "k", fileName: "a.exe", fileSize: 100, mimeType: "application/x-msdownload" }],
      })
    ).rejects.toThrow("Validation Error: File a.exe has unsupported type.");
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

    const baseLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: baseStart,
      endTime: baseEnd,
      description: "Base session",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });
    expect(baseLog).toBeDefined();

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
  });

  test("createLog should succeed if overlapping only with a soft-deleted log", async () => {
    const baseStart = new Date(Date.now() - 7200000);
    const baseEnd = new Date(Date.now() - 3600000);

    const baseLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: baseStart,
      endTime: baseEnd,
      description: "Base session",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });
    expect(baseLog).toBeDefined();

    await logService.deleteLog(baseLog.id, testUserId);

    const newLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: baseStart,
      endTime: baseEnd,
      description: "Overlapping session with deleted log",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });
    expect(newLog).toBeDefined();
  });

  test("updateLog should succeed if overlapping only with a soft-deleted log", async () => {
    const baseStart = new Date(Date.now() - 7200000);
    const baseEnd = new Date(Date.now() - 3600000);

    const baseLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: baseStart,
      endTime: baseEnd,
      description: "Base session",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    const otherLog = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: new Date(baseStart.getTime() - 7200000),
      endTime: new Date(baseStart.getTime() - 3600000),
      description: "Other session",
      evidence: [{ fileUrl: "https://x.com/a.png", fileKey: "k", fileName: "a.png", fileSize: 100, mimeType: "image/png" }],
    });

    await logService.deleteLog(baseLog.id, testUserId);

    const updated = await logService.updateLog(otherLog.id, testUserId, {
      startTime: baseStart,
      endTime: baseEnd,
    });
    expect(updated).toBeDefined();
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
    expect(log.duration).toBe(3600);

    const detailed = await logQueryService.getLogById(log.id);
    expect(detailed).toBeDefined();
    expect(detailed!.tasks.length).toBe(1);
    expect(detailed!.tasks[0]).toBe(testTaskId);
    expect(detailed!.evidence.length).toBe(1);
    expect((detailed!.evidence[0] as any).file_name).toBe("a.png");
  });

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

    const fetched = await logQueryService.getLogById(log.id);
    expect(fetched).toBeNull();
  });

  test("importLogs should create all logs if no error", async () => {
    const now = Date.now();
    const logs: ImportedLogInput[] = [
      {
        title: "Test log 1",
        description: "Test log 1 description",
        startTime: new Date(now - 14400000),
        endTime: new Date(now - 10800000),
        projectName: "Project 1",
        taskTitles: ["Clean Kitchen"],
        evidenceUrls: ["https://x.com/a.png"],
      },
      {
        title: "Test log 2",
        description: "Test log 2 description",
        startTime: new Date(now - 7200000),
        endTime: new Date(now - 3600000),
        projectName: "Project 1",
        taskTitles: ["Clean Kitchen"],
        evidenceUrls: ["https://x.com/b.png"],
      },
    ];

    const result = await logService.importLogs(
      testUserId,
      testOrgId,
      null,
      logs
    );
    expect(result.successCount).toBe(2);
    expect(result.errors).toHaveLength(0);

    const fetchedLogs = await logQueryService.getUserLogs(testUserId);
    expect(fetchedLogs.length).toBe(2);
  });

  test("importLogs should fail if end time is before start time", async () => {
    const logs: ImportedLogInput[] = [
      {
        title: "Test log 1",
        description: "Test log 1 description",
        startTime: new Date(),
        endTime: new Date(new Date().getTime() - 1000),
        projectName: "Test project",
        taskTitles: ["Test task 1"],
        evidenceUrls: ["https://x.com/a.png"],
      },
    ];

    const result = await logService.importLogs(
      testUserId,
      testOrgId,
      null,
      logs
    );
    expect(result.successCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toBe("Validation Error: Start time must be before end time");
  });
});
