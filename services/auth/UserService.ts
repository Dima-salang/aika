import { db, DBInstance } from "@/db";
import {
  User,
  UserSqlite,
  userFilterZodSchema,
  updateUserInputZodSchema,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray, SQL } from "drizzle-orm";
import { OrganizationService } from "./OrganizationService";
import { TeamService } from "./TeamService";
import { tables } from "../../db/tables";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  is_admin: z.boolean().optional(),
});

const listUsersFilterSchema = userFilterZodSchema.optional();

export class UserService {
  private organizationService: OrganizationService;
  private teamService: TeamService;

  constructor(organizationService: OrganizationService, teamService: TeamService) {
    this.organizationService = organizationService;
    this.teamService = teamService;
  }

  async getUserById(id: string, tx: DBInstance = db): Promise<User | UserSqlite | null> {
    z.string().parse(id);
    const table = tables.user;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async listUsers(
    tx: DBInstance = db,
    filter?: z.infer<typeof userFilterZodSchema>,
    offset = 0,
    limit = 10
  ): Promise<Array<User | UserSqlite>> {
    const parsedFilter = listUsersFilterSchema.parse(filter);
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.user;
    let query = tx.select().from(table).$dynamic();

    const conditions: SQL[] = [];
    if (parsedFilter) {
      if (parsedFilter.email) {
        conditions.push(eq(table.email, parsedFilter.email));
      }
      if (parsedFilter.organizationId) {
        const members = await this.organizationService.getMembers(parsedFilter.organizationId, tx);
        const userIds = members.map((m) => m.userId);
        if (userIds.length > 0) {
          conditions.push(inArray(table.id, userIds));
        } else {
          return [];
        }
      }
      if (parsedFilter.teamId) {
        const members = await this.teamService.getTeamMembers(parsedFilter.teamId, tx);
        const userIds = members.map((m) => m.user_id);
        if (userIds.length > 0) {
          conditions.push(inArray(table.id, userIds));
        } else {
          return [];
        }
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

  async updateUser(id: string, data: z.infer<typeof updateUserInputZodSchema>, tx: DBInstance = db): Promise<User | UserSqlite | null> {
    z.string().parse(id);
    const parsedData = updateUserInputZodSchema.parse(data);
    const table = tables.user;
    const [res] = await tx
      .update(table)
      .set({
        ...parsedData,
        updatedAt: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteUser(id: string, tx: DBInstance = db): Promise<User | UserSqlite | null> {
    z.string().parse(id);
    const table = tables.user;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async createUser(data: z.infer<typeof createUserSchema>, tx: DBInstance = db): Promise<User | UserSqlite | null> {
    const parsedData = createUserSchema.parse(data);
    const table = tables.user;
    const newId = crypto.randomUUID();
    const [res] = await tx
      .insert(table)
      .values({
        id: newId,
        name: parsedData.name,
        email: parsedData.email,
        emailVerified: false,
        is_admin: parsedData.is_admin || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return res || null;
  }

  async setActiveTeam(userId: string, sessionId: string | undefined, teamId: string | null, tx: DBInstance = db): Promise<boolean> {
    z.string().parse(userId);
    z.string().optional().parse(sessionId);
    z.string().nullable().parse(teamId);

    const userTable = tables.user;
    await tx
      .update(userTable)
      .set({
        last_active_team_id: teamId,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, userId));

    if (sessionId) {
      const sessionTable = tables.session;
      await tx
        .update(sessionTable)
        .set({
          activeTeamId: teamId,
          updatedAt: new Date(),
        })
        .where(eq(sessionTable.id, sessionId));
    }
    return true;
  }
}
