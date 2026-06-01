import { db, isSQLite } from "@/db";
import { tasks, tasksSqlite } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export class TaskService {
  async getTaskById(id: string, tx: any = db): Promise<any> {
    if (isSQLite) {
      const [res] = await tx
        .select()
        .from(tasksSqlite)
        .where(and(eq(tasksSqlite.id, id), isNull(tasksSqlite.deleted_at)));
      return res || null;
    } else {
      const [res] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), isNull(tasks.deleted_at)));
      return res || null;
    }
  }
}
