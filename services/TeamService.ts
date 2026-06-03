import { db, isSQLite } from "@/db";
import {
  teams,
  teamsSqlite,
  teamMembers,
  teamMembersSqlite,
  Team,
  TeamSqlite,
  NewTeam,
  NewTeamSqlite,
  TeamMember,
  TeamMemberSqlite,
  NewTeamMember,
  NewTeamMemberSqlite,
  user,
  userSqlite,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";


export class TeamService {
  async getTeamMembers(teamId: string, tx: any = db): Promise<Array<TeamMember | TeamMemberSqlite>> {
    const table = isSQLite ? teamMembersSqlite : teamMembers;
    return await tx
      .select()
      .from(table)
      .where(eq(table.team_id, teamId));
  }

  async addTeamMember(
    teamId: string,
    userId: string,
    role: "leader" | "member",
    tx: any = db
  ): Promise<TeamMember | TeamMemberSqlite | null> {
    const table = isSQLite ? teamMembersSqlite : teamMembers;
    const usersTable = isSQLite ? userSqlite : user;
    const id = `${teamId}-${userId}`;

    // check if the user is not deleted
    const userExists = await tx.select()
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), isNull(usersTable.deleted_at)))
      .limit(1);
    
    if (userExists.length === 0) {
      throw new Error("User is inactive or does not exist");
    }

    // check if the team member already exists
    const existingMember = await tx
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1)
    if (existingMember.length > 0) {
        // set deleted_at to null to reactivate the member if they were soft-deleted
        const [reactivated] = await tx
            .update(table)
            .set({
                deleted_at: null,
            })
            .where(eq(table.id, id))
            .returning();

        return reactivated || existingMember[0];
    }
    const [res] = await tx
      .insert(table)
      .values({
        id,
        team_id: teamId,
        user_id: userId,
        role,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async updateTeamMember(
    team_member: Partial<TeamMember | TeamMemberSqlite>,
    tx: any = db
  ): Promise<TeamMember | TeamMemberSqlite | null> {
    const table = isSQLite ? teamMembersSqlite : teamMembers;
    const [res] = await tx
      .update(table)
      .set({
        ...team_member,
        updated_at: new Date(),
      })
      .where(eq(table.id, team_member.id!))
      .returning();
    return res || null;
  }

  async removeTeamMember(teamId: string, userId: string, tx: any = db): Promise<TeamMember | TeamMemberSqlite | null> {
    const table = isSQLite ? teamMembersSqlite : teamMembers;
    const id = `${teamId}-${userId}`;
    const [res] = await tx
      .delete(table)
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async addTeam(team: NewTeam | NewTeamSqlite, tx: any = db): Promise<Team | TeamSqlite | null> {
    const table = isSQLite ? teamsSqlite : teams;
    const [res] = await tx
      .insert(table)
      .values({
        ...team,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return res || null;
  }

  async getTeam(id: string, tx: any = db): Promise<Team | TeamSqlite | null> {
    const table = isSQLite ? teamsSqlite : teams;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.id, id), isNull(table.deleted_at)));
    return res || null;
  }

  async listTeams(
    filter?: { id?: string; organizationId?: string; organizations?: string[]; deleted?: boolean },
    limit = 10,
    offset = 0,
    tx: any = db
  ): Promise<Array<Team | TeamSqlite>> {
    const table = isSQLite ? teamsSqlite : teams;
    let query = tx.select().from(table).$dynamic();

    const conditions: any[] = [];
    if (filter) {
      if (filter.id) {
        conditions.push(eq(table.id, filter.id));
      }
      if (filter.organizationId) {
        conditions.push(eq(table.organization_id, filter.organizationId));
      }
      if (filter.organizations && filter.organizations.length > 0) {
        conditions.push(inArray(table.organization_id, filter.organizations));
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

  async updateTeam(
    id: string,
    team: Partial<NewTeam | NewTeamSqlite>,
    tx: any = db
  ): Promise<Team | TeamSqlite | null> {
    const table = isSQLite ? teamsSqlite : teams;
    const [res] = await tx
      .update(table)
      .set({
        ...team,
        updated_at: new Date(),
      })
      .where(eq(table.id, id))
      .returning();
    return res || null;
  }

  async deleteTeam(teamId: string, tx: any = db): Promise<Team | TeamSqlite | null> {
    const table = isSQLite ? teamsSqlite : teams;
    const [res] = await tx
      .update(table)
      .set({
        deleted_at: new Date(),
      })
      .where(eq(table.id, teamId))
      .returning();
    return res || null;
  }

  async getUserMemberships(userId: string, tx: any = db): Promise<Array<TeamMember | TeamMemberSqlite>> {
    const table = isSQLite ? teamMembersSqlite : teamMembers;
    return await tx
      .select()
      .from(table)
      .where(eq(table.user_id, userId));
  }
}