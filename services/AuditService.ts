import { db, DBInstance } from "@/db";
import { eq } from "drizzle-orm";
import { tables } from "./tables";
import { AuditLog, AuditLogSqlite, auditLogZodSchema } from "@/db/schema";
import { z } from "zod";

const createAuditLogSchema = z.object({
  userId: z.string().nullable(),
  event: z.string(),
  tableName: z.string().nullable(),
  recordId: z.string().nullable(),
  description: z.string(),
  payload: z.unknown().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export class AuditService {
  async createAuditLog(
    userId: string | null,
    event: string,
    tableName: string | null,
    recordId: string | null,
    description: string,
    payload?: unknown,
    ipAddress?: string,
    userAgent?: string,
    tx: DBInstance = db
  ): Promise<AuditLog | AuditLogSqlite> {
    const parsed = createAuditLogSchema.parse({
      userId,
      event,
      tableName,
      recordId,
      description,
      payload,
      ipAddress,
      userAgent,
    });

    const logData = {
      id: crypto.randomUUID(),
      user_id: parsed.userId,
      event: parsed.event,
      table_name: parsed.tableName,
      record_id: parsed.recordId,
      description: parsed.description,
      ip_address: parsed.ipAddress || null,
      user_agent: parsed.userAgent || null,
      payload: parsed.payload ? JSON.stringify(parsed.payload) : null,
      created_at: new Date(),
    };

    const table = tables.auditLogs;
    const [newLog] = await tx.insert(table).values(logData).returning();
    return newLog;
  }

  async getAuditLogById(id: string, tx: DBInstance = db): Promise<AuditLog | AuditLogSqlite | null> {
    z.string().parse(id);
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
    tx: DBInstance = db
  ): Promise<Array<AuditLog | AuditLogSqlite>> {
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.auditLogs;
    return await tx
      .select()
      .from(table)
      .limit(limit)
      .offset(offset);
  }
}
