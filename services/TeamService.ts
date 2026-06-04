import { db } from "@/db";
import {
  Team,
  TeamSqlite,
  NewTeam,
  NewTeamSqlite,
  TeamMember,
  TeamMemberSqlite,
} from "@/db/schema";
import { eq, and, isNull, isNotNull, inArray } from "drizzle-orm";
import { tables } from "./tables";

export class TeamService {
  async getTeamMembers(teamId: string, tx: any = db): Promise<Array<TeamMember | TeamMemberSqlite>> {
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
    tx: any = db
  ): Promise<TeamMember | TeamMemberSqlite | null> {
    const table = tables.teamMembers;
    const usersTable = tables.user;
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
    const existingMember = await this.verifyTeamMember(teamId, userId, tx);
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
    const table = tables.teamMembers;
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
  async verifyTeamMember(teamId: string, userId: string, tx: any = db): Promise<boolean> {
    const table = tables.teamMembers;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.team_id, teamId), eq(table.user_id, userId)))
      .limit(1);
    return !!res;
  }

  // verify if user is a leader of a team
  async verifyLeader(teamId: string, userId: string, tx: any = db): Promise<boolean> {
    const table = tables.teamMembers;
    const [res] = await tx
      .select()
      .from(table)
      .where(and(eq(table.team_id, teamId), eq(table.user_id, userId), eq(table.role, "leader")))
      .limit(1);
    return !!res;
  }

  async addTeam(team: NewTeam | NewTeamSqlite, tx: any = db): Promise<Team | TeamSqlite | null> {
    const table = tables.teams;
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
    const table = tables.teams;
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
    const table = tables.teams;
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
    const table = tables.teams;
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

  async getUserMemberships(userId: string, tx: any = db): Promise<Array<TeamMember | TeamMemberSqlite>> {
    const table = tables.teamMembers;
    return await tx
      .select()
      .from(table)
      .where(eq(table.user_id, userId));
  }

  async getTeamMembersWithDetails(teamId: string, tx: any = db): Promise<any[]> {
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
}