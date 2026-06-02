import { describe, test, expect, beforeEach } from "bun:test";
import { NotificationService } from "../NotificationService";
import { clearDatabase } from "./db-helper";
import { db } from "@/db";
import { notificationsSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("NotificationService", () => {
  const notificationService = new NotificationService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("should successfully create a notification with standard parameters", async () => {
    const userId = "user-123";
    const title = "New Task Assigned";
    const message = "You have been assigned a task.";
    const type = "task_update";

    const notif = await notificationService.createNotification(
      userId,
      title,
      message,
      type
    );

    expect(notif).toBeDefined();
    expect(notif.id).toBeDefined();
    expect(notif.user_id).toBe(userId);
    expect(notif.title).toBe(title);
    expect(notif.message).toBe(message);
    expect(notif.type).toBe(type);
    expect(notif.is_read).toBe(false);
    expect(notif.related_id).toBeNull();
    expect(notif.created_at).toBeInstanceOf(Date);

    // Verify database contains the record
    const [dbNotif] = await db
      .select()
      .from(notificationsSqlite)
      .where(eq(notificationsSqlite.id, notif.id));
    expect(dbNotif).toBeDefined();
    expect(dbNotif.title).toBe(title);
  });

  test("should successfully create a notification with optional relatedId", async () => {
    const userId = "user-123";
    const title = "Team Invitation";
    const message = "You have been invited to Team Alpha.";
    const type = "team_invitation";
    const relatedId = "team-abc";

    const notif = await notificationService.createNotification(
      userId,
      title,
      message,
      type,
      relatedId
    );

    expect(notif).toBeDefined();
    expect(notif.related_id).toBe(relatedId);
  });
});
