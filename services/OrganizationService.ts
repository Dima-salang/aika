import { db, isSQLite } from "@/db";
import {
  organization,
  organizationSqlite,
  member,
  memberSqlite,
  Organization,
  OrganizationSqlite,
  NewOrganization,
  NewOrganizationSqlite,
  Member,
  MemberSqlite,
  NewMember,
  NewMemberSqlite,
  newOrganizationZodSchema,
} from "@/db/schema";
import { eq, and, like } from "drizzle-orm";

export class OrganizationService {
  async getOrganization(id: string, tx: any = db): Promise<Organization | OrganizationSqlite | null> {
    const table = isSQLite ? organizationSqlite : organization;
    const [res] = await tx
      .select()
      .from(table)
      .where(eq(table.id, id));
    return res || null;
  }

  async createOrganization(
    data: Omit<NewOrganization, "createdAt"> | Omit<NewOrganizationSqlite, "createdAt">,
    tx: any = db
  ): Promise<Organization | OrganizationSqlite | null> {
    const table = isSQLite ? organizationSqlite : organization;
    const [res] = await tx
      .insert(table)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateOrganization(
    id: string,
    data: Partial<NewOrganization | NewOrganizationSqlite>,
    tx: any = db
  ): Promise<Organization | OrganizationSqlite | null> {
    const table = isSQLite ? organizationSqlite : organization;
    const [res] = await tx
      .update(table)
      .set(data)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteOrganization(id: string, tx: any = db): Promise<Organization | OrganizationSqlite | null> {
    const table = isSQLite ? organizationSqlite : organization;
    const [res] = await tx
      .delete(table)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async listOrganizations(
    filter?: { slug?: string; metadataSearch?: string },
    limit = 10,
    offset = 0,
    tx: any = db
  ): Promise<Array<Organization | OrganizationSqlite>> {
    const table = isSQLite ? organizationSqlite : organization;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (filter) {
      if (filter.slug) {
        conditions.push(eq(table.slug, filter.slug));
      }
      if (filter.metadataSearch) {
        conditions.push(like(table.metadata, `%${filter.metadataSearch}%`));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.limit(limit).offset(offset);
  }

  async getMembers(organizationId: string, tx: any = db): Promise<Array<Member | MemberSqlite>> {
    const table = isSQLite ? memberSqlite : member;
    return await tx
      .select()
      .from(table)
      .where(eq(table.organizationId, organizationId));
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: string,
    tx: any = db
  ): Promise<Member | MemberSqlite | null> {
    const table = isSQLite ? memberSqlite : member;
    const id = `${organizationId}-${userId}`;
    const [res] = await tx
      .insert(table)
      .values({
        id,
        organizationId,
        userId,
        role,
        createdAt: new Date(),
      })
      .returning();
    return res || null;
  }

  async removeMember(organizationId: string, userId: string, tx: any = db): Promise<Member | MemberSqlite | null> {
    const table = isSQLite ? memberSqlite : member;
    const [res] = await tx
      .delete(table)
      .where(and(eq(table.organizationId, organizationId), eq(table.userId, userId)))
      .returning();
    return res || null;
  }

  async getUserMemberships(userId: string, tx: any = db): Promise<Array<Member | MemberSqlite>> {
    const table = isSQLite ? memberSqlite : member;
    return await tx
      .select()
      .from(table)
      .where(eq(table.userId, userId));
  }
}