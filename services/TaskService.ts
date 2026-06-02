import { db, isSQLite } from "@/db";
import {
  tasks,
  tasksSqlite,
  Task,
  TaskSqlite,
  NewTask,
  NewTaskSqlite,
} from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export class TaskService {
  async getTaskById(id: string, tx: any = db): Promise<Task | TaskSqlite | null> {
    const table = isSQLite ? tasksSqlite : tasks;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async createTask(
    task: NewTask | NewTaskSqlite,
    tx: any = db
  ): Promise<Task | TaskSqlite | null> {
    const table = isSQLite ? tasksSqlite : tasks;
    const [res] = await tx
      .insert(table)
      .values({
        ...task,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateTask(
    id: string,
    data: Partial<NewTask | NewTaskSqlite>,
    tx: any = db
  ): Promise<Task | TaskSqlite | null> {
    const table = isSQLite ? tasksSqlite : tasks;
    const [res] = await tx
      .update(table)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteTask(id: string, tx: any = db): Promise<Task | TaskSqlite | null> {
    const table = isSQLite ? tasksSqlite : tasks;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async listTasks(
    filter?: {
      id?: string;
      projectId?: string | null;
      userId?: string;
      teamId?: string | null;
      organizationId?: string;
      status?: "todo" | "in_progress" | "done";
      priority?: "low" | "medium" | "high";
      deleted?: boolean;
    },
    limit = 10,
    offset = 0,
    tx: any = db
  ): Promise<Array<Task | TaskSqlite>> {
    const table = isSQLite ? tasksSqlite : tasks;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (filter) {
      if (filter.id) {
        conditions.push(eq(table.id, filter.id));
      }
      if (filter.projectId !== undefined) {
        if (filter.projectId === null) {
          conditions.push(isNull(table.project_id));
        } else {
          conditions.push(eq(table.project_id, filter.projectId));
        }
      }
      if (filter.userId) {
        conditions.push(eq(table.user_id, filter.userId));
      }
      if (filter.teamId !== undefined) {
        if (filter.teamId === null) {
          conditions.push(isNull(table.team_id));
        } else {
          conditions.push(eq(table.team_id, filter.teamId));
        }
      }
      if (filter.organizationId) {
        conditions.push(eq(table.organization_id, filter.organizationId));
      }
      if (filter.status) {
        conditions.push(eq(table.status, filter.status));
      }
      if (filter.priority) {
        conditions.push(eq(table.priority, filter.priority));
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
}
