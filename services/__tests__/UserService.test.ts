import { describe, test, expect, beforeEach, mock } from "bun:test";
import { UserService } from "../UserService";
import { clearDatabase, db } from "./db-helper";
import { userSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DBInstance } from "@/db";

describe("UserService", () => {
  let mockOrganizationService: any;
  let mockTeamService: any;
  let userService: UserService;

  beforeEach(async () => {
    await clearDatabase();

    // Setup mock services
    mockOrganizationService = {
      getMembers: mock(() => Promise.resolve([])),
    };
    mockTeamService = {
      getTeamMembers: mock(() => Promise.resolve([])),
    };

    userService = new UserService(mockOrganizationService, mockTeamService);
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
});
