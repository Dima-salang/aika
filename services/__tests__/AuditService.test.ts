import { describe, test, expect, beforeEach } from "bun:test";
import { AuditService } from "../AuditService";
import { clearDatabase } from "./db-helper";
import { db } from "@/db";
import { auditLogsSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("AuditService", () => {
  const auditService = new AuditService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("should successfully create an audit log with required values", async () => {
    const userId = "test-user-id";
    const event = "user_login";
    const tableName = "user";
    const recordId = "user-123";
    const description = "User logged in successfully";

    const log = await auditService.createAuditLog(
      userId,
      event,
      tableName,
      recordId,
      description
    );

    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.user_id).toBe(userId);
    expect(log.event).toBe(event);
    expect(log.table_name).toBe(tableName);
    expect(log.record_id).toBe(recordId);
    expect(log.description).toBe(description);
    expect(log.payload).toBeNull();
    expect(log.ip_address).toBeNull();
    expect(log.user_agent).toBeNull();
    expect(log.created_at).toBeInstanceOf(Date);

    // Verify it exists in the database
    const [dbLog] = await db
      .select()
      .from(auditLogsSqlite)
      .where(eq(auditLogsSqlite.id, log.id));
    expect(dbLog).toBeDefined();
    expect(dbLog.event).toBe(event);
  });

  test("should successfully create an audit log with payload, ipAddress and userAgent", async () => {
    const userId = "test-user-id";
    const event = "profile_update";
    const tableName = "user";
    const recordId = "user-123";
    const description = "User updated their email";
    const payload = { oldEmail: "old@example.com", newEmail: "new@example.com" };
    const ipAddress = "192.168.1.1";
    const userAgent = "Mozilla/5.0";

    const log = await auditService.createAuditLog(
      userId,
      event,
      tableName,
      recordId,
      description,
      payload,
      ipAddress,
      userAgent
    );

    expect(log).toBeDefined();
    expect(log.payload).toBe(JSON.stringify(payload));
    expect(log.ip_address).toBe(ipAddress);
    expect(log.user_agent).toBe(userAgent);
  });

  test("should support null for optional fields", async () => {
    const log = await auditService.createAuditLog(
      null,
      "system_boot",
      null,
      null,
      "System started"
    );

    expect(log).toBeDefined();
    expect(log.user_id).toBeNull();
    expect(log.table_name).toBeNull();
    expect(log.record_id).toBeNull();
  });
});
