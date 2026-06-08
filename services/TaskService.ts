import { db, DBInstance } from "@/db";
import {
  Task,
  TaskSqlite,
  taskFilterZodSchema,
  newTaskZodSchema,
  updateTaskInputZodSchema,
  NewTask,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { tables } from "./tables";
import { z } from "zod";

const listTasksFilterSchema = taskFilterZodSchema.optional();

export class TaskService {
  async getTaskById(id: string, tx: DBInstance = db): Promise<Task | TaskSqlite | null> {
    z.string().parse(id);
    const table = tables.tasks;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async getTasksByIds(ids: string[], tx: DBInstance = db): Promise<Array<Task | TaskSqlite>> {
    z.array(z.string()).parse(ids);
    if (ids.length === 0) return [];
    const table = tables.tasks;
    return await tx
      .select()
      .from(table)
      .where(and(inArray(table.id, ids), isNull(table.deleted_at)));
  }

  async createTask(
    task: z.infer<typeof newTaskZodSchema>,
    tx: DBInstance = db
  ): Promise<Task | TaskSqlite | null> {
    const parsed = newTaskZodSchema.parse(task);
    const table = tables.tasks;
    const [res] = await tx
      .insert(table)
      .values({
        ...parsed,
        created_at: new Date(),
        updated_at: new Date(),
      } as NewTask)
      .returning();
    return res || null;
  }

  async updateTask(
    id: string,
    data: z.infer<typeof updateTaskInputZodSchema>,
    tx: DBInstance = db
  ): Promise<Task | TaskSqlite | null> {
    z.string().parse(id);
    const parsed = updateTaskInputZodSchema.parse(data);
    const table = tables.tasks;
    const [res] = await tx
      .update(table)
      .set({
        ...parsed,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteTask(id: string, tx: DBInstance = db): Promise<Task | TaskSqlite | null> {
    z.string().parse(id);
    const table = tables.tasks;
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
    filter?: z.infer<typeof taskFilterZodSchema>,
    limit = 10,
    offset = 0,
    tx: DBInstance = db
  ): Promise<Array<Task | TaskSqlite>> {
    const parsedFilter = listTasksFilterSchema.parse(filter);
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.tasks;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (parsedFilter) {
      if (parsedFilter.id) {
        conditions.push(eq(table.id, parsedFilter.id));
      }
      if (parsedFilter.projectId !== undefined) {
        if (parsedFilter.projectId === null) {
          conditions.push(isNull(table.project_id));
        } else {
          conditions.push(eq(table.project_id, parsedFilter.projectId));
        }
      }
      if (parsedFilter.userId) {
        conditions.push(eq(table.user_id, parsedFilter.userId));
      }
      if (parsedFilter.teamId !== undefined) {
        if (parsedFilter.teamId === null) {
          conditions.push(isNull(table.team_id));
        } else {
          conditions.push(eq(table.team_id, parsedFilter.teamId));
        }
      }
      if (parsedFilter.organizationId) {
        conditions.push(eq(table.organization_id, parsedFilter.organizationId));
      }
      if (parsedFilter.status) {
        conditions.push(eq(table.status, parsedFilter.status));
      }
      if (parsedFilter.priority) {
        conditions.push(eq(table.priority, parsedFilter.priority));
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

    return await query.limit(limit).offset(offset);
  }
}
