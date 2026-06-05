import { db } from "@/db";
import { eq } from "drizzle-orm";
import { tables } from "./tables";

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

    const table = tables.auditLogs;
    const [newLog] = await tx.insert(table).values(logData).returning();
    return newLog;
  }

  async getAuditLogById(id: string, tx: any = db): Promise<any> {
    const table = tables.auditLogs;
    const [res] = await tx
      .select()
      .from(table)
      .where(eq(table.id, id));
    return res || null;
  }

  async listAuditLogs(
    limit = 50,
    offset = 0,
    tx: any = db
  ): Promise<any[]> {
    const table = tables.auditLogs;
    return await tx
      .select()
      .from(table)
      .limit(limit)
      .offset(offset);
  }
}
