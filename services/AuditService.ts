import { db, isSQLite } from "@/db";
import { auditLogs, auditLogsSqlite } from "@/db/schema";

export class AuditService {
  async createAuditLog(
    userId: string | null,
    event: string,
    tableName: string | null,
    recordId: string | null,
    description: string,
    payload?: any,
    ipAddress?: string,
    userAgent?: string,
    tx: any = db
  ): Promise<any> {
    const logData = {
      id: crypto.randomUUID(),
      user_id: userId,
      event,
      table_name: tableName,
      record_id: recordId,
      description,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      payload: payload ? JSON.stringify(payload) : null,
      created_at: new Date(),
    };

    if (isSQLite) {
      const [newLog] = await tx.insert(auditLogsSqlite).values(logData).returning();
      return newLog;
    } else {
      const [newLog] = await tx.insert(auditLogs).values(logData).returning();
      return newLog;
    }
  }
}
