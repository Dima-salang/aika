import { describe, test, expect, beforeEach } from "bun:test";
import { OrganizationService } from "../OrganizationService";
import { clearDatabase } from "./db-helper";
import { db } from "@/db";
import { organizationSqlite, memberSqlite } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("OrganizationService", () => {
  const organizationService = new OrganizationService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("getOrganization should return null if it does not exist", async () => {
    const res = await organizationService.getOrganization("non-existent");
    expect(res).toBeNull();
  });

  test("getOrganization should return organization if it exists", async () => {
    const orgData = {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      createdAt: new Date(),
    };
    await db.insert(organizationSqlite).values(orgData);

    const res = await organizationService.getOrganization("org-1");
    expect(res).toBeDefined();
    expect(res!.id).toBe("org-1");
    expect(res!.name).toBe("Acme Corp");
    expect(res!.slug).toBe("acme-corp");
  });

  test("createOrganization should successfully insert organization", async () => {
    const orgData = {
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      metadata: JSON.stringify({ tier: "enterprise" }),
    };

    const res = await organizationService.createOrganization(orgData);
    expect(res).toBeDefined();
    expect(res!.id).toBe("org-1");
    expect(res!.name).toBe("Acme Corp");
    expect(res!.slug).toBe("acme-corp");
    expect(res!.createdAt).toBeInstanceOf(Date);

    // Verify it is in database
    const [dbOrg] = await db
      .select()
      .from(organizationSqlite)
      .where(eq(organizationSqlite.id, "org-1"));
    expect(dbOrg).toBeDefined();
    expect(dbOrg.slug).toBe("acme-corp");
  });

  test("updateOrganization should modify fields", async () => {
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      createdAt: new Date(),
    });

    const res = await organizationService.updateOrganization("org-1", {
      name: "Acme International",
      logo: "https://example.com/logo.png",
    });

    expect(res).toBeDefined();
    expect(res!.name).toBe("Acme International");
    expect(res!.logo).toBe("https://example.com/logo.png");
  });

  test("deleteOrganization should remove organization from database", async () => {
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Acme Corp",
      slug: "acme-corp",
      createdAt: new Date(),
    });

    const deleted = await organizationService.deleteOrganization("org-1");
    expect(deleted).toBeDefined();
    expect(deleted!.id).toBe("org-1");

    const fetch = await organizationService.getOrganization("org-1");
    expect(fetch).toBeNull();
  });

  test("listOrganizations should return organizations, supporting slug and metadata filtering", async () => {
    await db.insert(organizationSqlite).values([
      {
        id: "org-1",
        name: "Acme Corp",
        slug: "acme-corp",
        metadata: "{\"industry\":\"tech\"}",
        createdAt: new Date(),
      },
      {
        id: "org-2",
        name: "Beta Inc",
        slug: "beta-inc",
        metadata: "{\"industry\":\"finance\"}",
        createdAt: new Date(),
      },
    ]);

    // No filter
    const listAll = await organizationService.listOrganizations();
    expect(listAll.length).toBe(2);

    // Slug filter
    const listSlug = await organizationService.listOrganizations({ slug: "acme-corp" });
    expect(listSlug.length).toBe(1);
    expect(listSlug[0].id).toBe("org-1");

    // Metadata search filter
    const listMeta = await organizationService.listOrganizations({ metadataSearch: "finance" });
    expect(listMeta.length).toBe(1);
    expect(listMeta[0].id).toBe("org-2");
  });

  test("getMembers should return members of organization", async () => {
    await db.insert(memberSqlite).values([
      {
        id: "org-1-user-1",
        organizationId: "org-1",
        userId: "user-1",
        role: "admin",
        createdAt: new Date(),
      },
      {
        id: "org-1-user-2",
        organizationId: "org-1",
        userId: "user-2",
        role: "member",
        createdAt: new Date(),
      },
      {
        id: "org-2-user-3",
        organizationId: "org-2",
        userId: "user-3",
        role: "member",
        createdAt: new Date(),
      },
    ]);

    const res = await organizationService.getMembers("org-1");
    expect(res.length).toBe(2);
    const userIds = res.map(m => m.userId);
    expect(userIds).toContain("user-1");
    expect(userIds).toContain("user-2");
  });

  test("addMember should successfully insert new member association", async () => {
    const res = await organizationService.addMember("org-1", "user-1", "owner");
    expect(res).toBeDefined();
    expect(res!.organizationId).toBe("org-1");
    expect(res!.userId).toBe("user-1");
    expect(res!.role).toBe("owner");
    expect(res!.createdAt).toBeInstanceOf(Date);
  });

  test("removeMember should delete member association", async () => {
    await db.insert(memberSqlite).values({
      id: "org-1-user-1",
      organizationId: "org-1",
      userId: "user-1",
      role: "admin",
      createdAt: new Date(),
    });

    const removed = await organizationService.removeMember("org-1", "user-1");
    expect(removed).toBeDefined();
    expect(removed!.userId).toBe("user-1");

    const members = await organizationService.getMembers("org-1");
    expect(members.length).toBe(0);
  });
});
