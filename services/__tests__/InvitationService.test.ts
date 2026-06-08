import { describe, test, expect, beforeEach } from "bun:test";
import { InvitationService } from "../InvitationService";
import { clearDatabase, db } from "./db-helper";
import {
  userSqlite,
  organizationSqlite,
  teamsSqlite,
  memberSqlite,
  teamMembersSqlite,
  invitationSqlite,
  joinTokensSqlite,
  joinRequestsSqlite,
  notificationsSqlite,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

describe("InvitationService", () => {
  const invitationService = new InvitationService();

  beforeEach(async () => {
    await clearDatabase();
  });

  test("should successfully create an outbound invitation and notify existing user", async () => {
    // Setup org and inviter
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Org One",
      slug: "org-one",
      createdAt: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "inviter-1",
      name: "Inviter User",
      email: "inviter@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create target user that already exists
    await db.insert(userSqlite).values({
      id: "invitee-1",
      name: "Invitee User",
      email: "invitee@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const invite = await invitationService.inviteUser(
      "invitee@aika.com",
      "member",
      null,
      "org-1",
      "inviter-1"
    );

    expect(invite).toBeDefined();
    expect(invite!.id).toBeDefined();
    expect(invite!.email).toBe("invitee@aika.com");
    expect(invite!.organizationId).toBe("org-1");
    expect(invite!.inviterId).toBe("inviter-1");
    expect(invite!.status).toBe("pending");

    // Verify notification was created
    const notifs = await db
      .select()
      .from(notificationsSqlite)
      .where(eq(notificationsSqlite.user_id, "invitee-1"));
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("team_invitation");
    expect(notifs[0].related_id).toBe(invite!.id);
  });

  test("should generate cryptographically secure join tokens", async () => {
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Org One",
      slug: "org-one",
      createdAt: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "admin-1",
      name: "Admin User",
      email: "admin@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tokenRes = await invitationService.generateJoinToken(
      "org-1",
      null,
      "admin-1",
      3600, // 1 hour
      5 // max uses
    );

    expect(tokenRes).toBeDefined();
    expect(tokenRes!.id).toBeDefined();
    expect(tokenRes!.id.length).toBe(64); // 32-bytes hex string is 64 chars
    expect(tokenRes!.organizationId).toBe("org-1");
    expect(tokenRes!.maxUses).toBe(5);
    expect(tokenRes!.usesCount).toBe(0);

    const [dbToken] = await db
      .select()
      .from(joinTokensSqlite)
      .where(eq(joinTokensSqlite.id, tokenRes!.id));
    expect(dbToken).toBeDefined();
    expect(dbToken.createdBy).toBe("admin-1");
  });

  test("should allow applying with a valid join token", async () => {
    // Setup organization, admin, applicant
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Org One",
      slug: "org-one",
      createdAt: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "admin-1",
      name: "Admin User",
      email: "admin@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Make admin an admin in the organization so they get notified
    await db.insert(memberSqlite).values({
      id: "mem-admin",
      organizationId: "org-1",
      userId: "admin-1",
      role: "admin",
      createdAt: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "applicant-1",
      name: "Applicant User",
      email: "applicant@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tokenRes = await invitationService.generateJoinToken(
      "org-1",
      null,
      "admin-1",
      3600,
      2
    );

    const request = await invitationService.applyWithToken(tokenRes!.id, "applicant-1");

    expect(request).toBeDefined();
    expect(request!.id).toBeDefined();
    expect(request!.userId).toBe("applicant-1");
    expect(request!.organizationId).toBe("org-1");
    expect(request!.status).toBe("pending");

    // Verify token usage incremented
    const [dbToken] = await db
      .select()
      .from(joinTokensSqlite)
      .where(eq(joinTokensSqlite.id, tokenRes!.id));
    expect(dbToken.usesCount).toBe(1);

    // Verify admin was notified
    const notifs = await db
      .select()
      .from(notificationsSqlite)
      .where(eq(notificationsSqlite.user_id, "admin-1"));
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe("team_invitation");
    expect(notifs[0].related_id).toBe(request!.id);
  });

  test("should handle approvals and team assignments", async () => {
    // Setup org, team, admin, applicant
    await db.insert(organizationSqlite).values({
      id: "org-1",
      name: "Org One",
      slug: "org-one",
      createdAt: new Date(),
    });

    await db.insert(teamsSqlite).values({
      id: "team-1",
      organization_id: "org-1",
      name: "Team One",
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "admin-1",
      name: "Admin User",
      email: "admin@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(userSqlite).values({
      id: "applicant-1",
      name: "Applicant User",
      email: "applicant@aika.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const tokenRes = await invitationService.generateJoinToken(
      "org-1",
      "team-1",
      "admin-1"
    );

    const request = await invitationService.applyWithToken(tokenRes!.id, "applicant-1");

    // Approve the request
    const reviewRes = await invitationService.reviewJoinRequest(
      request!.id,
      "approved",
      "admin-1"
    );

    expect(reviewRes!.status).toBe("approved");

    // Verify user is now a member of organization
    const orgMembers = await db
      .select()
      .from(memberSqlite)
      .where(and(eq(memberSqlite.organizationId, "org-1"), eq(memberSqlite.userId, "applicant-1")));
    expect(orgMembers.length).toBe(1);

    // Verify user is member of the team
    const teamMembers = await db
      .select()
      .from(teamMembersSqlite)
      .where(and(eq(teamMembersSqlite.team_id, "team-1"), eq(teamMembersSqlite.user_id, "applicant-1")));
    expect(teamMembers.length).toBe(1);
    expect(teamMembers[0].role).toBe("member");

    // Verify applicant was notified
    const applicantNotifs = await db
      .select()
      .from(notificationsSqlite)
      .where(eq(notificationsSqlite.user_id, "applicant-1"));
    expect(applicantNotifs.length).toBe(1);
    expect(applicantNotifs[0].type).toBe("team_switch");
  });
});
