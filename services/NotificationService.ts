import { db, isSQLite } from "@/db";
import { notifications, notificationsSqlite } from "@/db/schema";

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
}
