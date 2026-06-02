import { db, isSQLite } from "@/db";
import {
  user,
  userSqlite,
  User,
  UserSqlite,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { OrganizationService } from "./OrganizationService";
import { TeamService } from "./TeamService";

export class UserService {
  private organizationService: OrganizationService;
  private teamService: TeamService;

  constructor(organizationService: OrganizationService, teamService: TeamService) {
    this.organizationService = organizationService;
    this.teamService = teamService;
  }

  async getUserById(id: string, tx: any = db): Promise<User | UserSqlite | null> {
    const table = isSQLite ? userSqlite : user;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async listUsers(
    tx: any = db,
    filter?: { email?: string; organizationId?: string; teamId?: string; deleted?: boolean },
    offset = 0,
    limit = 10
  ): Promise<Array<User | UserSqlite>> {
    const table = isSQLite ? userSqlite : user;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (filter) {
      if (filter.email) {
        conditions.push(eq(table.email, filter.email));
      }
      if (filter.organizationId) {
        const members = await this.organizationService.getMembers(filter.organizationId, tx);
        const userIds = members.map((m: any) => m.userId);
        if (userIds.length > 0) {
          conditions.push(inArray(table.id, userIds));
        } else {
          return [];
        }
      }
      if (filter.teamId) {
        const members = await this.teamService.getTeamMembers(filter.teamId, tx);
        const userIds = members.map((m: any) => m.user_id || m.userId);
        if (userIds.length > 0) {
          conditions.push(inArray(table.id, userIds));
        } else {
          return [];
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

  async updateUser(id: string, data: Partial<User> | Partial<UserSqlite>, tx: any = db): Promise<User | UserSqlite | null> {
    const table = isSQLite ? userSqlite : user;
    const [res] = await tx
      .update(table)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteUser(id: string, tx: any = db): Promise<User | UserSqlite | null> {
    const table = isSQLite ? userSqlite : user;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }
}
