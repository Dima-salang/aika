import { db, DBInstance } from "@/db";
import { eq, and, isNull, isNotNull, desc, SQL } from "drizzle-orm";
import { tables } from "../../db/tables";
import { Notification, NotificationSqlite, notificationZodSchema } from "@/db/schema";
import { z } from "zod";

const createNotificationSchema = z.object({
  userId: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(["team_invitation", "task_update", "time_log", "team_switch"]),
  relatedId: z.string().nullable().optional(),
});

type notificationSchema = z.infer<typeof createNotificationSchema>;

const listNotificationsFilterSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(["team_invitation", "task_update", "time_log", "team_switch"]).optional(),
  isRead: z.boolean().optional(),
  deleted: z.boolean().optional(),
}).optional();

export class NotificationService {
  /**
   * Creates a new notification record for a specific user.
   */
  async createNotification(
    notification: notificationSchema,
    tx: DBInstance = db
  ): Promise<Notification | NotificationSqlite> {
    const parsed = createNotificationSchema.parse(notification);
    const notificationData = {
      id: crypto.randomUUID(),
      user_id: parsed.userId,
      title: parsed.title,
      message: parsed.message,
      type: parsed.type,
      is_read: false,
      related_id: parsed.relatedId || null,
      created_at: new Date(),
    };

    const table = tables.notifications;
    const [newNotif] = await tx.insert(table).values(notificationData).returning();
    return newNotif;
  }

  /**
   * Bulk creates multiple notification records.
   */
  async createNotifications(
    notifications: notificationSchema[],
    tx: DBInstance = db
  ): Promise<Array<Notification | NotificationSqlite>> {
    if (notifications.length === 0) return [];
    const notificationData = notifications.map((parsed) => ({
      id: crypto.randomUUID(),
      user_id: parsed.userId,
      title: parsed.title,
      message: parsed.message,
      type: parsed.type,
      is_read: false,
      related_id: parsed.relatedId || null,
      created_at: new Date(),
    }));

    const table = tables.notifications;
    return await tx.insert(table).values(notificationData).returning();
  }

  /**
   * Retrieves a filtered list of notifications for users, default sorted descending by creation time.
   */
  async listNotifications(
    filter?: z.infer<typeof listNotificationsFilterSchema>,
    limit = 50,
    offset = 0,
    tx: DBInstance = db
  ): Promise<Array<Notification | NotificationSqlite>> {
    const parsedFilter = listNotificationsFilterSchema.parse(filter);
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.notifications;
    let query = tx.select().from(table).$dynamic();
    const conditions: SQL[] = [];

    if (parsedFilter) {
      if (parsedFilter.userId) {
        conditions.push(eq(table.user_id, parsedFilter.userId));
      }
      if (parsedFilter.type) {
        conditions.push(eq(table.type, parsedFilter.type));
      }
      if (parsedFilter.isRead !== undefined) {
        conditions.push(eq(table.is_read, parsedFilter.isRead));
      }
      if (parsedFilter.deleted) {
        conditions.push(isNotNull(table.deleted_at));
      } else {
        conditions.push(isNull(table.deleted_at));
      }
    } else {
      conditions.push(isNull(table.deleted_at));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    // order by descending
    query.orderBy(desc(table.created_at));
    return await query.limit(limit).offset(offset);
  }

  /**
   * Retrieves a specific notification record by its ID.
   */
  async getNotificationById(id: string, tx: DBInstance = db): Promise<Notification | NotificationSqlite | null> {
    z.string().parse(id);
    const table = tables.notifications;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  /**
   * Updates fields on an existing notification record.
   */
  async updateNotification(
    id: string,
    data: Partial<Omit<Notification | NotificationSqlite, "id">>,
    tx: DBInstance = db
  ): Promise<Notification | NotificationSqlite | null> {
    z.string().parse(id);
    const table = tables.notifications;
    const [res] = await tx
      .update(table)
      .set({
        ...data,
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  /**
   * Soft-deletes a notification record by updating its deleted_at field.
   */
  async deleteNotification(id: string, tx: DBInstance = db): Promise<Notification | NotificationSqlite | null> {
    z.string().parse(id);
    const table = tables.notifications;
    const [res] = await tx
      .update(table)
      .set({ deleted_at: new Date() })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }
}
