import { db, isSQLite } from "@/db";
import {
  projects,
  projectsSqlite,
  Project,
  ProjectSqlite,
  NewProject,
  NewProjectSqlite,
} from "@/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

export class ProjectService {
  async getProject(id: string, tx: any = db): Promise<Project | ProjectSqlite | null> {
    const table = isSQLite ? projectsSqlite : projects;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async createProject(
    project: NewProject | NewProjectSqlite,
    tx: any = db
  ): Promise<Project | ProjectSqlite | null> {
    const table = isSQLite ? projectsSqlite : projects;
    const [res] = await tx
      .insert(table)
      .values({
        ...project,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateProject(
    id: string,
    data: Partial<NewProject | NewProjectSqlite>,
    tx: any = db
  ): Promise<Project | ProjectSqlite | null> {
    const table = isSQLite ? projectsSqlite : projects;
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

  async deleteProject(id: string, tx: any = db): Promise<Project | ProjectSqlite | null> {
    const table = isSQLite ? projectsSqlite : projects;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async listProjects(
    filter?: { id?: string; teamId?: string | null; organizationId?: string; deleted?: boolean },
    limit = 10,
    offset = 0,
    tx: any = db
  ): Promise<Array<Project | ProjectSqlite>> {
    const table = isSQLite ? projectsSqlite : projects;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (filter) {
      if (filter.id) {
        conditions.push(eq(table.id, filter.id));
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