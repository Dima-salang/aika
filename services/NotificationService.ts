import { db, isSQLite } from "@/db";
import { notifications, notificationsSqlite } from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string, // 'team_invitation' | 'task_update' | 'time_log' | 'team_switch'
    relatedId?: string,
    tx: any = db
  ): Promise<any> {
    const notificationData = {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      related_id: relatedId || null,
      created_at: new Date(),
    };

    if (isSQLite) {
      const [newNotif] = await tx.insert(notificationsSqlite).values(notificationData).returning();
      return newNotif;
    } else {
      const [newNotif] = await tx.insert(notifications).values(notificationData).returning();
      return newNotif;
    }
  }

  async listNotifications(
    filter?: { userId?: string; type?: string; isRead?: boolean; deleted?: boolean },
    limit = 50,
    offset = 0,
    tx: any = db
  ): Promise<any[]> {
    const table = isSQLite ? notificationsSqlite : notifications;
    let query = tx.select().from(table).$dynamic();
    const conditions: any[] = [];

    if (filter) {
      if (filter.userId) {
        conditions.push(eq(table.user_id, filter.userId));
      }
      if (filter.type) {
        conditions.push(eq(table.type, filter.type));
      }
      if (filter.isRead !== undefined) {
        conditions.push(eq(table.is_read, filter.isRead));
      }
      if (filter.deleted) {
        conditions.push(isNotNull(table.deleted_at)); // soft-deleted notification filtering
      } else {
        conditions.push(isNull(table.deleted_at));
      }
    } else {
      conditions.push(isNull(table.deleted_at));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    return await query.limit(limit).offset(offset);
  }

  async getNotificationById(id: string, tx: any = db): Promise<any> {
    const table = isSQLite ? notificationsSqlite : notifications;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async updateNotification(
    id: string,
    data: any,
    tx: any = db
  ): Promise<any> {
    const table = isSQLite ? notificationsSqlite : notifications;
    const [res] = await tx
      .update(table)
      .set({
        ...data,
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteNotification(id: string, tx: any = db): Promise<any> {
    const table = isSQLite ? notificationsSqlite : notifications;
    const [res] = await tx
      .update(table)
      .set({ deleted_at: new Date() })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }
}

