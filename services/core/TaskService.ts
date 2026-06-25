import { db, DBInstance } from "@/db";
import {
  Task,
  TaskSqlite,
  taskFilterZodSchema,
  newTaskZodSchema,
  updateTaskInputZodSchema,
  NewTask,
  PaginationInput,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray, desc, SQL } from "drizzle-orm";
import { tables } from "@/db/tables";
import { z } from "zod";

const listTasksFilterSchema = taskFilterZodSchema.optional();
type ListTasksFilterSchema = z.infer<typeof listTasksFilterSchema>;


export class TaskService {
  /**
   * Retrieves a single active task by its ID.
   */
  async getTaskById(id: string, tx: DBInstance = db): Promise<Task | TaskSqlite | null> {
    z.string().parse(id);
    const table = tables.tasks;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  /**
   * Retrieves a list of active tasks matching the provided list of IDs.
   */
  async getTasksByIds(ids: string[], tx: DBInstance = db): Promise<Array<Task | TaskSqlite>> {
    z.array(z.string()).parse(ids);
    if (ids.length === 0) return [];
    const table = tables.tasks;
    return await tx
      .select()
      .from(table)
      .where(and(inArray(table.id, ids), isNull(table.deleted_at)));
  }

  /**
   * Creates a new task.
   */
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

  /**
   * Updates an existing task's metadata.
   */
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

  /**
   * Soft-deletes a task by updating its deleted_at field.
   */
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

  /**
   * Retrieves a paginated list of tasks matching the specified filters.
   */
  async listTasks(
    filter: ListTasksFilterSchema,
    pagination: PaginationInput,
    tx: DBInstance = db
  ): Promise<Array<Task | TaskSqlite>> {
    const table = tables.tasks;
    let query = tx.select().from(table).$dynamic();

    const conditions: SQL[] = [];
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

    // sort in descending
    query = query.orderBy(desc(table.updated_at));

    return await query.limit(pagination.limit ?? 10).offset(pagination.offset ?? 0);
  }
}
