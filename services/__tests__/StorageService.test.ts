import { describe, test, expect, beforeEach, mock } from "bun:test";
import { LogService } from "../LogService";
import { AuditService } from "../AuditService";
import { NotificationService } from "../NotificationService";
import { TaskService } from "../TaskService";
import { UserService } from "../UserService";
import { OrganizationService } from "../OrganizationService";
import { TeamService } from "../TeamService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, timeLogsSqlite, documentEvidencesSqlite, organizationSqlite } from "@/db/schema";
import { StorageService, StorageProvider } from "@/services/StorageService";

// Mock providers
export class MockProvider implements StorageProvider {
  uploaded: { fileBuffer: Buffer; path: string; mimeType: string }[] = [];
  deleted: string[] = [];

  constructor(private prefix: string) {}

  async upload(fileBuffer: Buffer, path: string, mimeType: string): Promise<string> {
    this.uploaded.push({ fileBuffer, path, mimeType });
    return `https://mock-${this.prefix}-provider.com/${path}`;
  }

  async delete(fileUrl: string): Promise<void> {
    this.deleted.push(fileUrl);
  }
}

describe("Storage Service and Log Evidence Deletion", () => {
  let cloudinaryMock: MockProvider;
  let supabaseMock: MockProvider;
  let storageService: StorageService;
  
  let auditService: AuditService;
  let notificationService: NotificationService;
  let taskService: TaskService;
  let organizationService: OrganizationService;
  let teamService: TeamService;
  let userService: UserService;
  let logService: LogService;

  const testUserId = "user-123";
  const testOrgId = "org-123";

  beforeEach(async () => {
    await clearDatabase();

    cloudinaryMock = new MockProvider("cloudinary");
    supabaseMock = new MockProvider("supabase");
    storageService = new StorageService(cloudinaryMock, supabaseMock);

    // Set globally or mock singleton if applicable
    StorageService.setInstance(storageService);

    auditService = new AuditService();
    notificationService = new NotificationService();
    taskService = new TaskService();
    organizationService = new OrganizationService();
    teamService = new TeamService();
    storageService = new StorageService(cloudinaryMock, supabaseMock);
    userService = new UserService(organizationService, teamService);
    logService = new LogService(
      auditService,
      taskService,
      storageService,
    );

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
  });

  test("should route images to Cloudinary and documents to Supabase", async () => {
    const imgBuffer = Buffer.from("fake-image");
    const docBuffer = Buffer.from("fake-pdf");

    const imgUrl = await storageService.upload(imgBuffer, "pic.png", "image/png");
    const docUrl = await storageService.upload(docBuffer, "doc.pdf", "application/pdf");

    expect(imgUrl).toContain("cloudinary");
    expect(docUrl).toContain("supabase");

    expect(cloudinaryMock.uploaded.length).toBe(1);
    expect(supabaseMock.uploaded.length).toBe(1);
  });

  test("should identify and delete orphaned evidence when updating a time log", async () => {
    // 1. Create a time log with two evidence files
    const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const log = await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      projectId: null,
      startTime,
      endTime,
      title: "Doing work",
      description: "Writing some tests",
      taskIds: [],
      evidence: [
        {
          fileUrl: "https://res.cloudinary.com/mock/image/upload/v1/organizations/org-123/users/user-123/images/key-A.png",
          fileKey: "key-A",
          fileName: "evidenceA.png",
          fileSize: 1024,
          mimeType: "image/png",
        },
        {
          fileUrl: "https://mock-supabase-storage.co/object/public/evidences/organizations/org-123/users/user-123/key-B.pdf",
          fileKey: "key-B",
          fileName: "evidenceB.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
        }
      ],
    });

    // 2. Update time log keeping B, removing A, and adding C
    await logService.updateLog(log.id, testUserId, {
      organizationId: testOrgId,
      title: "Doing work updated",
      evidence: [
        {
          fileUrl: "https://mock-supabase-storage.co/object/public/evidences/organizations/org-123/users/user-123/key-B.pdf",
          fileKey: "key-B",
          fileName: "evidenceB.pdf",
          fileSize: 2048,
          mimeType: "application/pdf",
        },
        {
          fileUrl: "https://res.cloudinary.com/mock/image/upload/v1/organizations/org-123/users/user-123/images/key-C.png",
          fileKey: "key-C",
          fileName: "evidenceC.png",
          fileSize: 1024,
          mimeType: "image/png",
        }
      ]
    });

    // Verify A was deleted from the Cloudinary mock provider
    expect(cloudinaryMock.deleted).toContain("https://res.cloudinary.com/mock/image/upload/v1/organizations/org-123/users/user-123/images/key-A.png");
    // Verify B was NOT deleted since it remained
    expect(supabaseMock.deleted.length).toBe(0);
  });
});
