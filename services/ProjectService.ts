import { db } from "@/db";
import {
  Project,
  ProjectSqlite,
  NewProject,
  NewProjectSqlite,
} from "@/db/schema";
import { eq, and, or, isNull, isNotNull } from "drizzle-orm";
import { tables } from "./tables";

export class ProjectService {
  async getProject(id: string, tx: any = db): Promise<Project | ProjectSqlite | null> {
    const table = tables.projects;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async createProject(
    project: NewProject | NewProjectSqlite,
    userId?: string,
    tx: any = db
  ): Promise<Project | ProjectSqlite | null> {
    if (userId) {
      const orgMemberTable = tables.member;
      const isOrgMember = await tx
        .select()
        .from(orgMemberTable)
        .where(
          and(
            eq(orgMemberTable.organizationId, project.organization_id),
            eq(orgMemberTable.userId, userId)
          )
        )
        .limit(1);

      if (isOrgMember.length === 0) {
        throw new Error("Validation Error: User does not belong to the specified organization");
      }

      if (project.team_id) {
        const teamMemberTable = tables.teamMembers;
        const isTeamMember = await tx
          .select()
          .from(teamMemberTable)
          .where(
            and(
              eq(teamMemberTable.team_id, project.team_id),
              eq(teamMemberTable.user_id, userId)
            )
          )
          .limit(1);

        if (isTeamMember.length === 0) {
          throw new Error("Validation Error: User does not belong to the specified team");
        }
      }
    }

    const table = tables.projects;
    const [res] = await tx
      .insert(table)
      .values({
        ...project,
        user_id: userId || null,
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
    const table = tables.projects;
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
    const table = tables.projects;
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
    filter?: { id?: string; teamId?: string | null; organizationId?: string; deleted?: boolean; userId?: string },
    limit = 10,
    offset = 0,
    tx: any = db
  ): Promise<Array<Project | ProjectSqlite>> {
    const table = tables.projects;
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
        if (filter.organizationId === "org-default" && filter.userId) {
          // In the default workspace, only show team projects OR personal projects created by this user
          conditions.push(eq(table.organization_id, filter.organizationId));
          conditions.push(
            or(
              isNotNull(table.team_id),
              eq(table.user_id, filter.userId)
            )
          );
        } else {
          conditions.push(eq(table.organization_id, filter.organizationId));
        }
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