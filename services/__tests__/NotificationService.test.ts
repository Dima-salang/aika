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

  test("should successfully list, update, and delete notifications", async () => {
    const userId = "user-123";
    const notif1 = await notificationService.createNotification(
      userId,
      "Notif 1",
      "Msg 1",
      "task_update"
    );
    const notif2 = await notificationService.createNotification(
      userId,
      "Notif 2",
      "Msg 2",
      "time_log"
    );

    // List notifications
    const list = await notificationService.listNotifications({ userId });
    expect(list.length).toBe(2);

    // Get single notification
    const single = await notificationService.getNotificationById(notif1.id);
    expect(single).toBeDefined();
    expect(single.title).toBe("Notif 1");

    // Update notification
    const updated = await notificationService.updateNotification(notif1.id, { is_read: true });
    expect(updated.is_read).toBe(true);

    // Delete notification
    await notificationService.deleteNotification(notif2.id);
    const afterDelete = await notificationService.getNotificationById(notif2.id);
    expect(afterDelete).toBeNull();
  });
});

