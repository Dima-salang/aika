import { describe, test, expect, beforeEach, mock } from "bun:test";
import { UserService, UserNotFoundError } from "../auth/UserService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite, memberSqlite, teamMembersSqlite, organizationSqlite, teamsSqlite, accountSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DBInstance } from "@/db";
import { OrganizationService } from "../auth/OrganizationService";
import { TeamService } from "../auth/TeamService";

describe("UserService", () => {
  let mockOrganizationService: { getMembers: ReturnType<typeof mock>; getOrganization: ReturnType<typeof mock> };
  let mockTeamService: { getTeamMembers: ReturnType<typeof mock>; getTeam: ReturnType<typeof mock> };
  let userService: UserService;
 
  beforeEach(async () => {
    await clearDatabase();
 
    // Setup mock services
    mockOrganizationService = {
      getMembers: mock(() => Promise.resolve([])),
      getOrganization: mock((id: string) => Promise.resolve({ id, name: "Mock Org " + id })),
    };
    mockTeamService = {
      getTeamMembers: mock(() => Promise.resolve([])),
      getTeam: mock((id: string) => Promise.resolve({ id, name: "Mock Team " + id })),
    };
 
    userService = new UserService(
      mockOrganizationService as unknown as OrganizationService,
      mockTeamService as unknown as TeamService
    );
  });

  test("getUserById should return null if user does not exist", async () => {
    const res = await userService.getUserById("non-existent");
    expect(res).toBeNull();
  });

  test("getUserById should return user if exists and not deleted", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const res = await userService.getUserById("user-1");
    expect(res).toBeDefined();
    expect(res!.id).toBe("user-1");
    expect(res!.name).toBe("Alice");
  });

  test("getUserById should return null if user is soft deleted", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
      deleted_at: new Date(),
    });

    const res = await userService.getUserById("user-1");
    expect(res).toBeNull();
  });

  test("listUsers should return active users by default", async () => {
    const now = new Date();
    await db.insert(userSqlite).values([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        deleted_at: new Date(), // Soft deleted
      },
    ]);

    const res = await userService.listUsers();
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("user-1");
  });

  test("listUsers should filter by email", async () => {
    const now = new Date();
    await db.insert(userSqlite).values([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const res = await userService.listUsers(db as unknown as DBInstance, { email: "bob@example.com" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("user-2");
  });

  test("listUsers should filter by organizationId via organizationService.getMembers", async () => {
    const now = new Date();
    await db.insert(userSqlite).values([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    mockOrganizationService.getMembers = mock((orgId: string) => {
      expect(orgId).toBe("org-123");
      return Promise.resolve([{ userId: "user-2" }]);
    });

    const res = await userService.listUsers(db as unknown as DBInstance, { organizationId: "org-123" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("user-2");
  });

  test("listUsers should filter by teamId via teamService.getTeamMembers", async () => {
    const now = new Date();
    await db.insert(userSqlite).values([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    mockTeamService.getTeamMembers = mock((teamId: string) => {
      expect(teamId).toBe("team-456");
      return Promise.resolve([{ user_id: "user-1" }]);
    });

    const res = await userService.listUsers(db as unknown as DBInstance, { teamId: "team-456" });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("user-1");
  });

  test("listUsers should return empty if members lists are empty", async () => {
    mockOrganizationService.getMembers = mock(() => Promise.resolve([]));
    const res = await userService.listUsers(db as unknown as DBInstance, { organizationId: "org-empty" });
    expect(res.length).toBe(0);
  });

  test("listUsers should support returning deleted users", async () => {
    const now = new Date();
    await db.insert(userSqlite).values([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "user-2",
        name: "Bob",
        email: "bob@example.com",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
        deleted_at: new Date(),
      },
    ]);

    const res = await userService.listUsers(db as unknown as DBInstance, { deleted: true });
    expect(res.length).toBe(1);
    expect(res[0].id).toBe("user-2");
  });

  test("updateUser should partially update user information", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const updated = await userService.updateUser("user-1", { name: "Alice Smith" });
    expect(updated).toBeDefined();
    expect(updated!.name).toBe("Alice Smith");
    expect(updated!.email).toBe("alice@example.com");

    const [dbUser] = await db
      .select()
      .from(userSqlite)
      .where(eq(userSqlite.id, "user-1"));
    expect(dbUser.name).toBe("Alice Smith");
  });

  test("deleteUser should soft-delete user", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-1",
      name: "Alice",
      email: "alice@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const deleted = await userService.deleteUser("user-1");
    expect(deleted).toBeDefined();
    expect(deleted!.deleted_at).toBeInstanceOf(Date);

    // Should not show in getById anymore
    const user = await userService.getUserById("user-1");
    expect(user).toBeNull();
  });

  test("getManagedProfile should return empty lists when user manages nothing", async () => {
    const profile = await userService.getManagedProfile("user-empty");
    expect(profile.managedOrgs.length).toBe(0);
    expect(profile.managedTeams.length).toBe(0);
  });

  test("getManagedProfile should return managed orgs and teams", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-mgr",
      name: "Manager",
      email: "manager@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Organization One",
      slug: "org-1",
      createdAt: now,
    });

    await db.insert(memberSqlite).values({
      id: "member-1",
      userId: "user-mgr",
      organizationId: "org-1",
      role: "admin",
      createdAt: now,
    });

    await db.insert(teamsSqlite).values({
      id: "team-1",
      name: "Engineering",
      organization_id: "org-1",
      created_at: now,
      updated_at: now,
    });

    await db.insert(teamMembersSqlite).values({
      id: "tm-1",
      team_id: "team-1",
      user_id: "user-mgr",
      role: "leader",
      created_at: now,
      updated_at: now,
    });

    const profile = await userService.getManagedProfile("user-mgr");
    expect(profile.managedOrgs.length).toBe(1);
    expect(profile.managedOrgs[0].id).toBe("org-1");
    expect(profile.managedTeams.length).toBe(1);
    expect(profile.managedTeams[0].id).toBe("team-1");
  });

  test("getUserProfileDetails should throw UserNotFoundError if user doesn't exist", async () => {
    expect(userService.getUserProfileDetails("non-existent-user", "caller-1")).rejects.toThrow(UserNotFoundError);
  });

  test("getUserProfileDetails should return profile with canViewPrivateData as true for self", async () => {
    const now = new Date();
    await db.insert(userSqlite).values({
      id: "user-self",
      name: "Self",
      email: "self@example.com",
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const details = await userService.getUserProfileDetails("user-self", "user-self");
    expect(details.user.id).toBe("user-self");
    expect(details.canViewPrivateData).toBe(true);
  });
});
