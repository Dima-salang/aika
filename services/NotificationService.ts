import { db } from "@/db";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import { tables } from "./tables";

export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
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

    const table = tables.notifications;
    const [newNotif] = await tx.insert(table).values(notificationData).returning();
    return newNotif;
  }

  async listNotifications(
    filter?: { userId?: string; type?: string; isRead?: boolean; deleted?: boolean },
    limit = 50,
    offset = 0,
    tx: any = db
  ): Promise<any[]> {
    const table = tables.notifications;
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
    return await query.limit(limit).offset(offset);
  }

  async getNotificationById(id: string, tx: any = db): Promise<any> {
    const table = tables.notifications;
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

  async deleteNotification(id: string, tx: any = db): Promise<any> {
    const table = tables.notifications;
    const [res] = await tx
      .update(table)
      .set({ deleted_at: new Date() })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }
}
