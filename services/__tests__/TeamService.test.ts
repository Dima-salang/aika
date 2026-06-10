import { describe, test, expect, beforeEach } from "bun:test";
import { TeamService } from "../TeamService";
import { clearDatabase } from "./db-helper";
import { db } from "./db-helper";
import { teamsSqlite, teamMembersSqlite, userSqlite, organizationSqlite } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

describe("TeamService", () => {
  const teamService = new TeamService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("getTeamMembers should return team members list", async () => {
    await db.insert(teamMembersSqlite).values([
      {
        id: "team-1-user-1",
        team_id: "team-1",
        user_id: "user-1",
        role: "leader",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "team-1-user-2",
        team_id: "team-1",
        user_id: "user-2",
        role: "member",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "team-2-user-3",
        team_id: "team-2",
        user_id: "user-3",
        role: "member",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    const members = await teamService.getTeamMembers("team-1");
    expect(members.length).toBe(2);
    const userIds = members.map((m) => m.user_id);
    expect(userIds).toContain("user-1");
    expect(userIds).toContain("user-2");
  });

  test("getTeamMembersWithDetails should return team members joined with user details", async () => {
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(teamMembersSqlite).values({
      id: "team-1-user-1",
      team_id: "team-1",
      user_id: "user-1",
      role: "leader",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const members = await teamService.getTeamMembersWithDetails("team-1");
    expect(members.length).toBe(1);
    expect(members[0].userId).toBe("user-1");
    expect(members[0].userName).toBe("Alice");
    expect(members[0].userEmail).toBe("alice@example.com");
    expect(members[0].role).toBe("leader");
  });

  test("addTeamMember should throw error if user does not exist or is inactive", async () => {
    // Enable database constraint checks for this test case
    await db.run(sql`PRAGMA foreign_keys = ON`);

    // Attempt with non-existent user
    expect(
      teamService.addTeamMember("team-1", "non-existent", "member")
    ).rejects.toThrow("Failed query");

    // Seed deleted user
    await db.insert(userSqlite).values({
      id: "deleted-user",
      name: "Deleted",
      email: "deleted@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted_at: new Date(),
    });

    expect(
      teamService.addTeamMember("team-1", "deleted-user", "member")
    ).rejects.toThrow("User is inactive or does not exist");
  });

  test("addTeamMember should insert a new member if valid", async () => {
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await teamService.addTeamMember("team-1", "user-1", "leader");
    expect(res).toBeDefined();
    expect(res!.team_id).toBe("team-1");
    expect(res!.user_id).toBe("user-1");
    expect(res!.role).toBe("leader");

    const [dbMember] = await db
      .select()
      .from(teamMembersSqlite)
      .where(eq(teamMembersSqlite.id, "team-1-user-1"));
    expect(dbMember).toBeDefined();
  });

  test("addTeamMember should reactivate a soft-deleted team member", async () => {
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed soft-deleted team member
    await db.insert(teamMembersSqlite).values({
      id: "team-1-user-1",
      team_id: "team-1",
      user_id: "user-1",
      role: "member",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: new Date(),
    });

    const res = await teamService.addTeamMember("team-1", "user-1", "member");
    expect(res).toBeDefined();
    expect(res!.user_id).toBe("user-1");

    // Verify it is reactivated (update team member query sets deleted_at to null)
    const [dbMember] = await db
      .select()
      .from(teamMembersSqlite)
      .where(eq(teamMembersSqlite.id, "team-1-user-1"));
    expect(dbMember.deleted_at).toBeNull();
  });

  test("updateTeamMember should update fields", async () => {
    await db.insert(teamMembersSqlite).values({
      id: "team-1-user-1",
      team_id: "team-1",
      user_id: "user-1",
      role: "member",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const res = await teamService.updateTeamMember({
      id: "team-1-user-1",
      role: "leader",
    });

    expect(res).toBeDefined();
    expect(res!.role).toBe("leader");
  });

  test("removeTeamMember should delete the member mapping", async () => {
    await db.insert(teamMembersSqlite).values({
      id: "team-1-user-1",
      team_id: "team-1",
      user_id: "user-1",
      role: "member",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const removed = await teamService.removeTeamMember("team-1", "user-1");
    expect(removed).toBeDefined();

    const [dbMember] = await db
      .select()
      .from(teamMembersSqlite)
      .where(eq(teamMembersSqlite.id, "team-1-user-1"));
    expect(dbMember).toBeUndefined();
  });

  test("addTeam should insert a new team", async () => {
    const res = await teamService.addTeam({
      id: "team-1",
      organization_id: "org-1",
      name: "Team Alpha",
    });

    expect(res).toBeDefined();
    expect(res!.id).toBe("team-1");
    expect(res!.name).toBe("Team Alpha");
    expect(res!.created_at).toBeInstanceOf(Date);
  });

  test("getTeam should return active team", async () => {
    await db.insert(teamsSqlite).values({
      id: "team-1",
      organization_id: "org-1",
      name: "Team Alpha",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const team = await teamService.getTeam("team-1");
    expect(team).toBeDefined();
    expect(team!.name).toBe("Team Alpha");
  });

  test("getTeam should return null if deleted", async () => {
    await db.insert(teamsSqlite).values({
      id: "team-1",
      organization_id: "org-1",
      name: "Team Alpha",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: new Date(),
    });

    const team = await teamService.getTeam("team-1");
    expect(team).toBeNull();
  });

  test("listTeams should return teams matching criteria", async () => {
    await db.insert(teamsSqlite).values([
      {
        id: "team-1",
        organization_id: "org-1",
        name: "Team Alpha",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: "team-2",
        organization_id: "org-2",
        name: "Team Beta",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Query organizationId
    const resOrg = await teamService.listTeams({ organizationId: "org-1" });
    expect(resOrg.length).toBe(1);
    expect(resOrg[0].id).toBe("team-1");

    // Query multiple organizations
    const resOrgs = await teamService.listTeams({ organizations: ["org-1", "org-2"] });
    expect(resOrgs.length).toBe(2);
  });

  test("updateTeam should change team data", async () => {
    await db.insert(teamsSqlite).values({
      id: "team-1",
      organization_id: "org-1",
      name: "Team Alpha",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const updated = await teamService.updateTeam("team-1", { name: "Team Gamma" });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Team Gamma");
  });

  test("deleteTeam should soft delete team", async () => {
    await db.insert(teamsSqlite).values({
      id: "team-1",
      organization_id: "org-1",
      name: "Team Alpha",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const deleted = await teamService.deleteTeam("team-1");
    expect(deleted).toBeDefined();
    expect(deleted!.deleted_at).toBeInstanceOf(Date);

    const check = await teamService.getTeam("team-1");
    expect(check).toBeNull();
  });
});
