import { db, DBInstance } from "@/db";
import {
  Organization,
  OrganizationSqlite,
  Member,
  MemberSqlite,
  organizationFilterZodSchema,
  createOrganizationInputZodSchema,
  updateOrganizationInputZodSchema,
} from "@/db/schema";
import { eq, and, like, SQL } from "drizzle-orm";
import { tables } from "../../db/tables";
import { z } from "zod";

const addMemberSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),
  role: z.string(),
});

const listOrganizationsFilterSchema = organizationFilterZodSchema.optional();

export interface UserMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: Date;
  organizationName: string;
}

export class OrganizationService {
  async getOrganization(id: string, tx: DBInstance = db): Promise<Organization | OrganizationSqlite | null> {
    z.string().parse(id);
    const table = tables.organization;
    const [res] = await tx
      .select()
      .from(table)
      .where(eq(table.id, id));
    return res || null;
  }

  async createOrganization(
    data: z.infer<typeof createOrganizationInputZodSchema>,
    tx: DBInstance = db
  ): Promise<Organization | OrganizationSqlite | null> {
    const parsed = createOrganizationInputZodSchema.parse(data);
    const table = tables.organization;
    const [res] = await tx
      .insert(table)
      .values({
        ...parsed,
        createdAt: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateOrganization(
    id: string,
    data: z.infer<typeof updateOrganizationInputZodSchema>,
    tx: DBInstance = db
  ): Promise<Organization | OrganizationSqlite | null> {
    z.string().parse(id);
    const parsed = updateOrganizationInputZodSchema.parse(data);
    const table = tables.organization;
    const [res] = await tx
      .update(table)
      .set(parsed)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteOrganization(id: string, tx: DBInstance = db): Promise<Organization | OrganizationSqlite | null> {
    z.string().parse(id);
    const table = tables.organization;
    const [res] = await tx
      .delete(table)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async listOrganizations(
    filter?: z.infer<typeof organizationFilterZodSchema>,
    limit = 10,
    offset = 0,
    tx: DBInstance = db
  ): Promise<Array<Organization | OrganizationSqlite>> {
    const parsedFilter = listOrganizationsFilterSchema.parse(filter);
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.organization;
    let query = tx.select().from(table).$dynamic();

    const conditions: SQL[] = [];
    if (parsedFilter) {
      if (parsedFilter.slug) {
        conditions.push(eq(table.slug, parsedFilter.slug));
      }
      if (parsedFilter.metadataSearch) {
        conditions.push(like(table.metadata, `%${parsedFilter.metadataSearch}%`));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.limit(limit).offset(offset);
  }

  async getMembers(organizationId: string, tx: DBInstance = db): Promise<Array<Member | MemberSqlite>> {
    z.string().parse(organizationId);
    const table = tables.member;
    return await tx
      .select()
      .from(table)
      .where(eq(table.organizationId, organizationId));
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: string,
    tx: DBInstance = db
  ): Promise<Member | MemberSqlite | null> {
    const parsed = addMemberSchema.parse({ organizationId, userId, role });
    const table = tables.member;
    const id = `${parsed.organizationId}-${parsed.userId}`;
    const [res] = await tx
      .insert(table)
      .values({
        id,
        organizationId: parsed.organizationId,
        userId: parsed.userId,
        role: parsed.role,
        createdAt: new Date(),
      })
      .returning();
    return res || null;
  }

  async removeMember(organizationId: string, userId: string, tx: DBInstance = db): Promise<Member | MemberSqlite | null> {
    z.string().parse(organizationId);
    z.string().parse(userId);
    const table = tables.member;
    const [res] = await tx
      .delete(table)
      .where(and(eq(table.organizationId, organizationId), eq(table.userId, userId)))
      .returning();
    return res || null;
  }

  async getUserMemberships(userId: string, tx: DBInstance = db): Promise<UserMembership[]> {
    z.string().parse(userId);
    const memberTable = tables.member;
    const orgTable = tables.organization;
    return await tx
      .select({
        id: memberTable.id,
        organizationId: memberTable.organizationId,
        userId: memberTable.userId,
        role: memberTable.role,
        createdAt: memberTable.createdAt,
        organizationName: orgTable.name,
      })
      .from(memberTable)
      .innerJoin(orgTable, eq(memberTable.organizationId, orgTable.id))
      .where(eq(memberTable.userId, userId));
  }
}