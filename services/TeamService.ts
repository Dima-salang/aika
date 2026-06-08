import { db, DBInstance } from "@/db";
import {
  Team,
  TeamSqlite,
  TeamMember,
  TeamMemberSqlite,
  teamFilterZodSchema,
  createTeamInputZodSchema,
  updateTeamInputZodSchema,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { tables } from "./tables";
import { z } from "zod";

const addTeamMemberSchema = z.object({
  teamId: z.string(),
  userId: z.string(),
  role: z.enum(["leader", "member"]),
});

const listTeamsFilterSchema = teamFilterZodSchema.optional();

export class TeamService {
  async getTeamMembers(teamId: string, tx: DBInstance = db): Promise<Array<TeamMember | TeamMemberSqlite>> {
    z.string().parse(teamId);
    const table = tables.teamMembers;
    return await tx
      .select()
      .from(table)
      .where(eq(table.team_id, teamId));
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: "leader" | "member",
    tx: DBInstance = db
  ): Promise<TeamMember | TeamMemberSqlite | null> {
    const parsed = addTeamMemberSchema.parse({ teamId, userId, role });
    const table = tables.teamMembers;
    const id = `${parsed.teamId}-${parsed.userId}`;

    // Check if user is soft-deleted
    const userTable = tables.user;
    const [deletedUser] = await tx
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, parsed.userId), isNotNull(userTable.deleted_at)))
      .limit(1);
    if (deletedUser) {
      throw new Error("Validation Error: User is inactive or does not exist");
    }

    // Ensure the user is a member of the team's organization first
    const team = await this.getTeam(parsed.teamId, tx);
    if (team) {
      const orgId = team.organization_id;
      const orgMemberTable = tables.member;
      const orgMemberId = `${orgId}-${parsed.userId}`;
      const [existingOrgMember] = await tx
        .select()
        .from(orgMemberTable)
        .where(eq(orgMemberTable.id, orgMemberId))
        .limit(1);

      if (!existingOrgMember) {
        await tx
          .insert(orgMemberTable)
          .values({
            id: orgMemberId,
            organizationId: orgId,
            userId: parsed.userId,
            role: "member",
            createdAt: new Date(),
          });
      }
    }

    // check if the team member already exists
    const existingMember = await this.verifyTeamMember(parsed.teamId, parsed.userId, tx);
    if (existingMember) {
        // set deleted_at to null to reactivate the member if they were soft-deleted
        const [reactivated] = await tx
            .update(table)
            .set({
                deleted_at: null,
            })
            .where(eq(table.id, id))
            .returning();

        return reactivated;
    }
    const [res] = await tx
      .insert(table)
      .values({
        id,
        team_id: parsed.teamId,
        user_id: parsed.userId,
        role: parsed.role,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateTeamMember(
    team_member: Partial<TeamMember | TeamMemberSqlite> & { id: string },
    tx: DBInstance = db
  ): Promise<TeamMember | TeamMemberSqlite | null> {
    z.string().parse(team_member.id);
    const table = tables.teamMembers;
    const [res] = await tx
      .update(table)
      .set({
        ...team_member,
        updated_at: new Date(),
      })
      .where(eq(table.id, team_member.id))
      .returning();
    return res || null;
  }

  async removeTeamMember(teamId: string, userId: string, tx: DBInstance = db): Promise<TeamMember | TeamMemberSqlite | null> {
    z.string().parse(teamId);
    z.string().parse(userId);
    const table = tables.teamMembers;
    const id = `${teamId}-${userId}`;

    // verify if user is a member of the team
    if (!await this.verifyTeamMember(teamId, userId, tx)) {
      throw new Error("User is not a member of this team");
    }

    const [res] = await tx
      .delete(table)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  // verify if user is a member of a team
  async verifyTeamMember(teamId: string, userId: string, tx: DBInstance = db): Promise<boolean> {
    z.string().parse(teamId);
    z.string().parse(userId);
    const table = tables.teamMembers;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.team_id, teamId), eq(table.user_id, userId)))
      .limit(1);
    return !!res;
  }

  // verify if user is a leader of a team
  async verifyLeader(teamId: string, userId: string, tx: DBInstance = db): Promise<boolean> {
    z.string().parse(teamId);
    z.string().parse(userId);
    const table = tables.teamMembers;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.team_id, teamId), eq(table.user_id, userId), eq(table.role, "leader")))
      .limit(1);
    return !!res;
  }

  async addTeam(team: z.infer<typeof createTeamInputZodSchema>, tx: DBInstance = db): Promise<Team | TeamSqlite | null> {
    const parsed = createTeamInputZodSchema.parse(team);
    const table = tables.teams;
    const [res] = await tx
      .insert(table)
      .values({
        ...parsed,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async getTeam(id: string, tx: DBInstance = db): Promise<Team | TeamSqlite | null> {
    z.string().parse(id);
    const table = tables.teams;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async listTeams(
    filter?: z.infer<typeof teamFilterZodSchema>,
    limit = 10,
    offset = 0,
    tx: DBInstance = db
  ): Promise<Array<Team | TeamSqlite>> {
    const parsedFilter = listTeamsFilterSchema.parse(filter);
    z.number().int().nonnegative().parse(offset);
    z.number().int().positive().parse(limit);

    const table = tables.teams;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (parsedFilter) {
      if (parsedFilter.id) {
        conditions.push(eq(table.id, parsedFilter.id));
      }
      if (parsedFilter.organizationId) {
        conditions.push(eq(table.organization_id, parsedFilter.organizationId));
      }
      if (parsedFilter.organizations && parsedFilter.organizations.length > 0) {
        conditions.push(inArray(table.organization_id, parsedFilter.organizations));
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

  async updateTeam(
    id: string,
    team: z.infer<typeof updateTeamInputZodSchema>,
    tx: DBInstance = db
  ): Promise<Team | TeamSqlite | null> {
    z.string().parse(id);
    const parsed = updateTeamInputZodSchema.parse(team);
    const table = tables.teams;
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

  async deleteTeam(teamId: string, tx: DBInstance = db): Promise<Team | TeamSqlite | null> {
    z.string().parse(teamId);
    const table = tables.teams;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, teamId))
      .returning();
    return res || null;
  }

  async getUserMemberships(userId: string, tx: DBInstance = db): Promise<any[]> {
    z.string().parse(userId);
    const teamMembersTable = tables.teamMembers;
    const teamsTable = tables.teams;
    return await tx
      .select({
        id: teamMembersTable.id,
        team_id: teamMembersTable.team_id,
        user_id: teamMembersTable.user_id,
        role: teamMembersTable.role,
        created_at: teamMembersTable.created_at,
        updated_at: teamMembersTable.updated_at,
        deleted_at: teamMembersTable.deleted_at,
        teamName: teamsTable.name,
      })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.team_id, teamsTable.id))
      .where(eq(teamMembersTable.user_id, userId));
  }

  async getTeamMembersWithDetails(teamId: string, tx: DBInstance = db): Promise<any[]> {
    z.string().parse(teamId);
    const membersTable = tables.teamMembers;
    const usersTable = tables.user;

    return await tx
      .select({
        id: membersTable.id,
        userId: membersTable.user_id,
        role: membersTable.role,
        userName: usersTable.name,
        userEmail: usersTable.email,
        userImage: usersTable.image,
      })
      .from(membersTable)
      .innerJoin(usersTable, eq(membersTable.user_id, usersTable.id))
      .where(eq(membersTable.team_id, teamId));
  }

  async getUserTeamsInOrg(userId: string, organizationId: string, tx: DBInstance = db): Promise<any[]> {
    z.string().parse(userId);
    z.string().parse(organizationId);
    const teamsTable = tables.teams;
    const membersTable = tables.teamMembers;

    return await tx
      .select({
        id: teamsTable.id,
        name: teamsTable.name,
        organization_id: teamsTable.organization_id,
        created_at: teamsTable.created_at,
        updated_at: teamsTable.updated_at,
      })
      .from(teamsTable)
      .innerJoin(membersTable, eq(teamsTable.id, membersTable.team_id))
      .where(
        and(
          eq(membersTable.user_id, userId),
          eq(teamsTable.organization_id, organizationId),
          isNull(teamsTable.deleted_at),
          isNull(membersTable.deleted_at)
        )
      );
  }
}