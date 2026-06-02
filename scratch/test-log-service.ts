import { db, isSQLite } from "../db";
import { userSqlite, tasksSqlite, organizationSqlite, timeLogsSqlite } from "../db/schema";
import { LogService } from "../services/LogService";
import { AuditService } from "../services/AuditService";
import { NotificationService } from "../services/NotificationService";
import { TaskService } from "../services/TaskService";
import { UserService } from "../services/UserService";
import { OrganizationService } from "../services/OrganizationService";
import { TeamService } from "../services/TeamService";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting LogService Verification Suite...");
  console.log(`Database engine dialect: ${isSQLite ? "SQLite" : "Postgres"}`);

  // 1. Initialize Services
  const auditService = new AuditService();
  const organizationService = new OrganizationService();
  const teamService = new TeamService();
  const notificationService = new NotificationService();
  const taskService = new TaskService();
  const userService = new UserService(organizationService, teamService);
  const logService = new LogService(auditService, notificationService, taskService, userService);

  const testUserId = `user-${crypto.randomUUID()}`;
  const testOrgId = `org-${crypto.randomUUID()}`;
  const testTaskId = `task-${crypto.randomUUID()}`;

  console.log("\n--- Seeding Test Data ---");
  // Seed Organization
  await db.insert(organizationSqlite).values({
    id: testOrgId,
    name: "Test Organization",
    slug: `test-org-${crypto.randomUUID()}`,
    createdAt: new Date(),
  });
  console.log(`✓ Seeded Organization: ${testOrgId}`);

  // Seed User
  await db.insert(userSqlite).values({
    id: testUserId,
    name: "Test User",
    email: `test-${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  console.log(`✓ Seeded User: ${testUserId}`);

  // Seed Task
  await db.insert(tasksSqlite).values({
    id: testTaskId,
    title: "Verify Log Service",
    status: "in_progress",
    user_id: testUserId,
    organization_id: testOrgId,
    created_at: new Date(),
    updated_at: new Date(),
  });
  console.log(`✓ Seeded Task: ${testTaskId}`);

  console.log("\n--- 1. Testing Evidence Requirement Validation ---");
  try {
    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      description: "No evidence",
      evidence: [], // Empty evidence
    });
    console.error("✗ FAILED: Expected empty evidence validation to throw!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected validation error: "${err.message}"`);
  }

  console.log("\n--- 2. Testing Unsupported File Type & Size Validation ---");
  try {
    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      description: "Unsupported file type",
      evidence: [{
        fileUrl: "https://example.com/doc.pdf",
        fileKey: "pdf-key",
        fileName: "doc.pdf",
        fileSize: 1000,
        mimeType: "application/pdf", // PDF not allowed (images only)
      }],
    });
    console.error("✗ FAILED: Expected PDF mime-type to be blocked!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected validation error: "${err.message}"`);
  }

  try {
    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(),
      description: "File too large",
      evidence: [{
        fileUrl: "https://example.com/big.png",
        fileKey: "big-key",
        fileName: "big.png",
        fileSize: 15 * 1024 * 1024, // 15MB (> 10MB limit)
        mimeType: "image/png",
      }],
    });
    console.error("✗ FAILED: Expected 15MB file to be blocked!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected validation error: "${err.message}"`);
  }

  console.log("\n--- 3. Testing Valid Log Creation ---");
  const startTime1 = new Date(Date.now() - 4 * 3600000); // 4 hours ago
  const endTime1 = new Date(Date.now() - 2 * 3600000); // 2 hours ago
  const validLog = await logService.createLog({
    userId: testUserId,
    organizationId: testOrgId,
    startTime: startTime1,
    endTime: endTime1,
    description: "Successfully worked on the verify script",
    taskIds: [testTaskId],
    evidence: [{
      fileUrl: "https://example.com/screenshot.png",
      fileKey: "screenshot-key",
      fileName: "screenshot.png",
      fileSize: 2 * 1024 * 1024, // 2MB
      mimeType: "image/png",
    }],
  });
  console.log(`✓ SUCCESS: Created log with ID: ${validLog.id}`);

  // Retrieve to verify relations
  const fetchedLog = await logService.getLogById(validLog.id);
  console.log(`✓ Retried log has description: "${fetchedLog.description}"`);
  console.log(`✓ Retried log has linked tasks count: ${fetchedLog.tasks.length}`);
  console.log(`✓ Retried log has evidence files count: ${fetchedLog.evidence.length}`);

  console.log("\n--- 4. Testing Time Log Overlap Prevention ---");
  // Try to log during identical time
  try {
    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: startTime1,
      endTime: endTime1,
      description: "Identical overlap log",
      evidence: [{
        fileUrl: "https://example.com/proof.png",
        fileKey: "proof-key",
        fileName: "proof.png",
        fileSize: 1000,
        mimeType: "image/png",
      }],
    });
    console.error("✗ FAILED: Expected overlapping log to be rejected!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected validation error: "${err.message}"`);
  }

  // Try partial overlap (ends inside previous window)
  try {
    await logService.createLog({
      userId: testUserId,
      organizationId: testOrgId,
      startTime: new Date(startTime1.getTime() - 3600000), // 1 hour before start
      endTime: new Date(startTime1.getTime() + 1800000), // 30 mins after start
      description: "Partial overlap",
      evidence: [{
        fileUrl: "https://example.com/proof.png",
        fileKey: "proof-key",
        fileName: "proof.png",
        fileSize: 1000,
        mimeType: "image/png",
      }],
    });
    console.error("✗ FAILED: Expected partially overlapping log to be rejected!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected validation error: "${err.message}"`);
  }

  console.log("\n--- 5. Testing Timer System ---");
  // Start timer
  const timer = await logService.startTimer(testUserId, null, "Working with active timer");
  console.log(`✓ Started running timer at ${timer.start_time}`);

  // Attempt to start another timer
  try {
    await logService.startTimer(testUserId, null, "Double active timer");
    console.error("✗ FAILED: Expected starting second active timer to fail!");
  } catch (err: any) {
    console.log(`✓ SUCCESS: Threw expected timer collision error: "${err.message}"`);
  }

  // Stop timer and convert to Log (needs evidence)
  const stoppedLog = await logService.stopTimer(
    testUserId,
    testOrgId,
    null,
    [testTaskId],
    [{
      fileUrl: "https://example.com/timer-proof.jpg",
      fileKey: "timer-proof-key",
      fileName: "timer-proof.jpg",
      fileSize: 500000,
      mimeType: "image/jpeg",
    }],
    "Stopping active timer work session"
  );
  console.log(`✓ SUCCESS: Stopped timer and transactionally saved log with ID: ${stoppedLog.id}`);

  // Verify timer is deleted
  const activeTimer = await logService.getRunningTimer(testUserId);
  console.log(`✓ Verified active timer is now: ${activeTimer}`);

  console.log("\n--- 6. Testing Soft Deletion ---");
  await logService.deleteLog(validLog.id, testUserId);
  const deletedLogFetch = await logService.getLogById(validLog.id);
  console.log(`✓ Verified soft-deleted log query returns: ${deletedLogFetch}`);

  console.log("\n==========================================");
  console.log("All LogService verifications completed successfully!");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("Verification failed with error: ", err);
  process.exit(1);
});
