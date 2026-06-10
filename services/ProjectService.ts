import { db, DBInstance } from "@/db";
import {
  Project,
  ProjectSqlite,
  projectFilterZodSchema,
  createProjectInputZodSchema,
  updateProjectInputZodSchema,
  PaginationInput,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, desc, SQL } from "drizzle-orm";
import { tables } from "./tables";
import { z } from "zod";

const listProjectsFilterSchema = projectFilterZodSchema.optional();

export class ProjectService {
  async getProject(id: string, tx: DBInstance = db): Promise<Project | ProjectSqlite | null> {
    z.string().parse(id);
    const table = tables.projects;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async createProject(
    project: z.infer<typeof createProjectInputZodSchema>,
    userId?: string,
    tx: DBInstance = db
  ): Promise<Project | ProjectSqlite | null> {
    const parsedProject = createProjectInputZodSchema.parse(project);
    z.string().optional().parse(userId);

    if (userId) {
      if (parsedProject.organization_id !== "org-default") {
        const orgMemberTable = tables.member;
        const [isOrgMember] = await tx
          .select()
          .from(orgMemberTable)
          .where(
            and(
              eq(orgMemberTable.organizationId, parsedProject.organization_id),
              eq(orgMemberTable.userId, userId)
            )
          )
          .limit(1);

        if (!isOrgMember) {
          throw new Error("Validation Error: User does not belong to the specified organization");
        }
      }

      if (parsedProject.team_id) {
        const teamMemberTable = tables.teamMembers;
        const [isTeamMember] = await tx
          .select()
          .from(teamMemberTable)
          .where(
            and(
              eq(teamMemberTable.team_id, parsedProject.team_id),
              eq(teamMemberTable.user_id, userId)
            )
          )
          .limit(1);

        if (!isTeamMember) {
          throw new Error("Validation Error: User does not belong to the specified team");
        }
      }
    }

    const table = tables.projects;
    const [res] = await tx
      .insert(table)
      .values({
        ...parsedProject,
        user_id: userId || null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateProject(
    id: string,
    data: z.infer<typeof updateProjectInputZodSchema>,
    tx: DBInstance = db
  ): Promise<Project | ProjectSqlite | null> {
    z.string().parse(id);
    const parsedData = updateProjectInputZodSchema.parse(data);
    const table = tables.projects;
    const [res] = await tx
      .update(table)
      .set({
        ...parsedData,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteProject(id: string, tx: DBInstance = db): Promise<Project | ProjectSqlite | null> {
    z.string().parse(id);
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
    pagination: PaginationInput,
    filter?: z.infer<typeof projectFilterZodSchema>,
    tx: DBInstance = db
  ): Promise<Array<Project | ProjectSqlite>> {
    const parsedFilter = listProjectsFilterSchema.parse(filter);

    const table = tables.projects;
    let query = tx.select().from(table).$dynamic();

    const conditions: SQL[] = [];
    if (parsedFilter) {
      if (parsedFilter.id) {
        conditions.push(eq(table.id, parsedFilter.id));
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
      if (parsedFilter.userId) {
        conditions.push(eq(table.user_id, parsedFilter.userId));
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

    return await query.limit(pagination.limit ?? 10).offset(pagination.offset ?? 0).orderBy(desc(table.updated_at));
  }
}