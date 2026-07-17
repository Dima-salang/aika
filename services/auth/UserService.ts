import { db, DBInstance } from "@/db";
import {
  User,
  UserSqlite,
  userFilterZodSchema,
  updateUserInputZodSchema,
} from "@/db/schema";
import { eq, and, or, isNull, isNotNull, inArray, desc, SQL } from "drizzle-orm";
import { OrganizationService } from "./OrganizationService";
import { TeamService } from "./TeamService";
import { tables } from "../../db/tables";
import { z } from "zod";

export class UserNotFoundError extends Error {
  constructor(message = "User not found") {
    super(message);
    this.name = "UserNotFoundError";
  }
}

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

  /**
   * Retrieves organizations and teams managed by a user.
   */
  async getManagedProfile(userId: string, tx: DBInstance = db) {
    z.string().parse(userId);
    const memberTable = tables.member;
    const teamMembersTable = tables.teamMembers;

    const orgMemberships = await tx
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, userId),
          or(
            eq(memberTable.role, "admin"),
            eq(memberTable.role, "owner"),
            eq(memberTable.role, "system_admin")
          )
        )
      );

    const managedOrgs = [];
    for (const m of orgMemberships) {
      const orgObj = await this.organizationService.getOrganization(m.organizationId, tx);
      if (orgObj) {
        managedOrgs.push(orgObj);
      }
    }

    const teamMemberships = await tx
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.user_id, userId),
          eq(teamMembersTable.role, "leader")
        )
      );

    const managedTeams = [];
    for (const tm of teamMemberships) {
      const teamObj = await this.teamService.getTeam(tm.team_id, tx);
      if (teamObj) {
        managedTeams.push(teamObj);
      }
    }

    return {
      managedOrgs,
      managedTeams,
    };
  }

  /**
   * Fetches target/caller user profiles, checks viewing permissions, and gathers profile details.
   * 
   * @throws {UserNotFoundError} If target user does not exist or is deleted.
   */
  async getUserProfileDetails(
    userId: string,
    callerId: string,
    tx: DBInstance = db
  ): Promise<{
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      createdAt: Date;
    };
    canViewPrivateData: boolean;
    evidence: any[];
    isGithubConnected: boolean;
  }> {
    z.string().parse(userId);
    z.string().parse(callerId);

    const userTable = tables.user;
    const memberTable = tables.member;
    const teamMembersTable = tables.teamMembers;

    const isSelf = userId === callerId;

    const [targetUser, callerUser, orgLink, teamLink, githubLink] = await Promise.all([
      // get target user
      tx
        .select()
        .from(userTable)
        .where(and(eq(userTable.id, userId), isNull(userTable.deleted_at)))
        .limit(1)
        .then((r) => r[0]),
      // get caller user
      tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, callerId))
        .limit(1)
        .then((r) => r[0]),
      // check if caller is org admin or owner
      isSelf
        ? Promise.resolve(null)
        : tx
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.userId, userId),
                inArray(
                  memberTable.organizationId,
                  tx
                    .select({ orgId: memberTable.organizationId })
                    .from(memberTable)
                    .where(
                      and(
                        eq(memberTable.userId, callerId),
                        or(eq(memberTable.role, "admin"), eq(memberTable.role, "owner"))
                      )
                    )
                )
              )
            )
            .limit(1)
            .then((r) => r[0]),
      // check if caller is team leader
      isSelf
        ? Promise.resolve(null)
        : tx
            .select({ id: teamMembersTable.id })
            .from(teamMembersTable)
            .where(
              and(
                eq(teamMembersTable.user_id, userId),
                isNull(teamMembersTable.deleted_at),
                inArray(
                  teamMembersTable.team_id,
                  tx
                    .select({ teamId: teamMembersTable.team_id })
                    .from(teamMembersTable)
                    .where(
                      and(
                        eq(teamMembersTable.user_id, callerId),
                        eq(teamMembersTable.role, "leader"),
                        isNull(teamMembersTable.deleted_at)
                      )
                    )
                )
              )
            )
            .limit(1)
            .then((r) => r[0]),
      // check if GitHub is linked
      tx
        .select({ id: tables.account.id })
        .from(tables.account)
        .where(and(eq(tables.account.userId, userId), eq(tables.account.providerId, "github")))
        .limit(1)
        .then((r) => r[0] || null),
    ]);

    if (!targetUser) {
      throw new UserNotFoundError();
    }

    const isSysAdmin = callerUser?.is_admin === true;
    const canViewPrivateData = isSelf || isSysAdmin || !!orgLink || !!teamLink;

    // get user evidence if allowed
    let evidence: any[] = [];
    if (canViewPrivateData) {
      const docTable = tables.documentEvidences;
      const logTable = tables.timeLogs;
      evidence = await tx
        .select({
          id: docTable.id,
          time_log_id: docTable.time_log_id,
          file_url: docTable.file_url,
          file_name: docTable.file_name,
          file_size: docTable.file_size,
          created_at: docTable.created_at,
          mime_type: docTable.mime_type,
          time_log_title: logTable.title,
          time_log_description: logTable.description,
        })
        .from(docTable)
        .innerJoin(logTable, eq(docTable.time_log_id, logTable.id))
        .where(
          and(
            eq(logTable.user_id, userId),
            isNull(docTable.deleted_at),
            isNull(logTable.deleted_at)
          )
        )
        .orderBy(desc(docTable.created_at));
    }

    return {
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        image: targetUser.image,
        createdAt: targetUser.createdAt,
      },
      canViewPrivateData,
      evidence,
      isGithubConnected: !!githubLink,
    };
  }
}
