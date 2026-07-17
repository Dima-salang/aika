import { db, DBInstance } from "@/db";
import {
  Invitation,
  InvitationSqlite,
  JoinToken,
  JoinTokenSqlite,
  JoinRequest,
  JoinRequestSqlite,
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";
import { AuditService } from "./AuditService";
import { NotificationService } from "./NotificationService";
import { OrganizationService } from "../auth/OrganizationService";
import { TeamService } from "../auth/TeamService";
import { tables } from "../../db/tables";
import { z } from "zod";

export class TokenNotFoundError extends Error {
  constructor(message = "Invalid join token") {
    super(message);
    this.name = "TokenNotFoundError";
  }
}

export class TokenExpiredError extends Error {
  constructor(message = "Join token has expired") {
    super(message);
    this.name = "TokenExpiredError";
  }
}

export class TokenLimitReachedError extends Error {
  constructor(message = "Join token usage limit reached") {
    super(message);
    this.name = "TokenLimitReachedError";
  }
}



const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.string(),
  teamId: z.string().nullable(),
  organizationId: z.string(),
  inviterId: z.string(),
});

type InviteUser = z.infer<typeof inviteUserSchema>

const generateJoinTokenSchema = z.object({
  organizationId: z.string(),
  teamId: z.string().nullable(),
  createdBy: z.string(),
  expiresInSeconds: z.number().int().positive().optional().default(86400),
  maxUses: z.number().int().positive().nullable().optional(),
  autoJoin: z.boolean().optional().default(false),
});

const applyWithTokenSchema = z.object({
  tokenString: z.string(),
  userId: z.string(),
});

const reviewJoinRequestSchema = z.object({
  requestId: z.string(),
  status: z.enum(["approved", "rejected"]),
  adminId: z.string(),
});

export class InvitationService {
  private auditService: AuditService;
  private notificationService: NotificationService;
  private organizationService: OrganizationService;
  private teamService: TeamService;

  constructor(
    auditService: AuditService = new AuditService(),
    notificationService: NotificationService = new NotificationService(),
    organizationService: OrganizationService = new OrganizationService(),
    teamService: TeamService = new TeamService()
  ) {
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.organizationService = organizationService;
    this.teamService = teamService;
  }

  // 1. Outbound Invitation
  /**
   * Invites a user to an organization and optional team via email.
   * Creates an in-app notification if the user is already registered.
   */
  async inviteUser(
    input: InviteUser,
    tx: DBInstance = db
  ): Promise<Invitation | InvitationSqlite | null> {
    const parsed = inviteUserSchema.parse(input);
    const table = tables.invitation;
    const userTable = tables.user;
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours expiration

    const [res] = await tx
      .insert(table)
      .values({
        id,
        email: parsed.email,
        role: parsed.role,
        organizationId: parsed.organizationId,
        status: "pending",
        expiresAt,
        inviterId: parsed.inviterId,
        teamId: parsed.teamId,
      })
      .returning();

    // Check if user already exists in the system to create an in-app notification
    const [existingUser] = await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(and(eq(userTable.email, parsed.email), isNull(userTable.deleted_at)))
      .limit(1);

    if (existingUser) {
      await this.notificationService.createNotification({
        userId: existingUser.id,
        title: "Organization Invitation",
        message: `You have been invited to join the organization.`,
        type: "team_invitation",
        relatedId: id,
      }, tx);
    }

    // Write audit log
    await this.auditService.createAuditLog(
      parsed.inviterId,
      "MEMBER_INVITED",
      "invitation",
      id,
      `Invited ${parsed.email} to organization ${parsed.organizationId} with role ${parsed.role}`,
      { email: parsed.email, role: parsed.role, teamId: parsed.teamId, organizationId: parsed.organizationId },
      undefined,
      undefined,
      tx
    );

    return res || null;
  }

  // 2. Generate Cryptographically Secure Join Token
  /**
   * Generates a secure, shareable magic link token for joining an organization.
   */
  async generateJoinToken(
    organizationId: string,
    teamId: string | null,
    createdBy: string,
    expiresInSeconds = 86400, // Default 24 hours
    maxUses: number | null = null,
    autoJoin = false,
    tx: DBInstance = db
  ): Promise<JoinToken | JoinTokenSqlite | null> {
    const parsed = generateJoinTokenSchema.parse({
      organizationId,
      teamId,
      createdBy,
      expiresInSeconds,
      maxUses,
      autoJoin,
    });
    const table = tables.joinTokens;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + parsed.expiresInSeconds * 1000);

    const [res] = await tx
      .insert(table)
      .values({
        id: token,
        organizationId: parsed.organizationId,
        teamId: parsed.teamId,
        createdBy: parsed.createdBy,
        expiresAt,
        maxUses: parsed.maxUses,
        usesCount: 0,
        autoJoin: parsed.autoJoin,
      })
      .returning();

    await this.auditService.createAuditLog(
      parsed.createdBy,
      "JOIN_TOKEN_GENERATED",
      "join_tokens",
      token,
      `Generated secure join token for organization ${parsed.organizationId}`,
      { organizationId: parsed.organizationId, teamId: parsed.teamId, expiresAt, maxUses: parsed.maxUses, autoJoin: parsed.autoJoin },
      undefined,
      undefined,
      tx
    );

    return res || null;
  }

  // 3. Apply With Token (Submit Join Request)
  /**
   * Submits a request to join an organization using a valid join token.
   * Auto-approves the request if the token has autoJoin enabled.
   * 
   * @throws {Error} If token is invalid, expired, or usage limit is reached.
   */
  async applyWithToken(
    tokenString: string,
    userId: string,
    tx: DBInstance = db
  ): Promise<JoinRequest | JoinRequestSqlite | null> {
    const parsed = applyWithTokenSchema.parse({ tokenString, userId });
    const tokenTable = tables.joinTokens;
    const requestTable = tables.joinRequests;
    const membersTable = tables.member;

    // Lookup token
    const [token] = await tx
      .select()
      .from(tokenTable)
      .where(eq(tokenTable.id, parsed.tokenString))
      .limit(1);

    if (!token) {
      throw new Error("Invalid join token");
    }

    if (new Date() > new Date(token.expiresAt)) {
      throw new Error("Join token has expired");
    }

    if (token.maxUses !== null && token.usesCount >= token.maxUses) {
      throw new Error("Join token use limit reached");
    }

    // Check if user is already in the organization
    const [existingMember] = await tx
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(and(eq(membersTable.organizationId, token.organizationId), eq(membersTable.userId, parsed.userId)))
      .limit(1);

    if (existingMember) {
      throw new Error("User is already a member of this organization");
    }

    // Increment token usage
    await tx
      .update(tokenTable)
      .set({ usesCount: token.usesCount + 1 })
      .where(eq(tokenTable.id, parsed.tokenString));

    if (token.autoJoin) {
      // 1. Instantly add user to organization
      await this.organizationService.addMember(token.organizationId, parsed.userId, "member", tx);

      // 2. Instantly add user to team if specified
      if (token.teamId) {
        await this.teamService.addTeamMember(token.teamId, parsed.userId, "member", tx);
        const userTable = tables.user;
        await tx
          .update(userTable)
          .set({ last_active_team_id: token.teamId, updatedAt: new Date() })
          .where(eq(userTable.id, parsed.userId));
      }

      // 3. Create approved join request record
      const requestId = crypto.randomUUID();
      const [newRequest] = await tx
        .insert(requestTable)
        .values({
          id: requestId,
          userId: parsed.userId,
          organizationId: token.organizationId,
          teamId: token.teamId,
          status: "approved",
          createdAt: new Date(),
        })
        .returning();

      // Notify applicant
      await this.notificationService.createNotification({
        userId: parsed.userId,
        title: "Welcome to Organization",
        message: `You have successfully joined the organization via magic link.`,
        type: "team_switch",
        relatedId: token.organizationId,
      }, tx);

      // Audit log auto-approval
      await this.auditService.createAuditLog(
        parsed.userId,
        "JOIN_REQUEST_AUTO_APPROVED",
        "join_requests",
        requestId,
        `Instantly joined organization ${token.organizationId} via auto-join magic link`,
        { token: parsed.tokenString, organizationId: token.organizationId, teamId: token.teamId },
        undefined,
        undefined,
        tx
      );

      return newRequest || null;
    }

    // Check if pending request already exists
    const [existingRequest] = await tx
      .select()
      .from(requestTable)
      .where(
        and(
          eq(requestTable.userId, parsed.userId),
          eq(requestTable.organizationId, token.organizationId),
          eq(requestTable.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      return existingRequest;
    }

    // Create the request
    const requestId = crypto.randomUUID();
    const [newRequest] = await tx
      .insert(requestTable)
      .values({
        id: requestId,
        userId: parsed.userId,
        organizationId: token.organizationId,
        teamId: token.teamId,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    // Let's query users with owner/admin roles to notify
    const orgMembers = await this.organizationService.getMembers(token.organizationId, tx);
    const adminsToNotify = orgMembers.filter((m) => m.role === "admin" || m.role === "owner" || m.role === "Admin");

    if (adminsToNotify.length > 0) {
      const adminNotifications = adminsToNotify.map((adminUser) => ({
        userId: adminUser.userId,
        title: "New Membership Request",
        message: `A user has requested to join your organization via magic link.`,
        type: "team_invitation" as const,
        relatedId: requestId,
      }));
      await this.notificationService.createNotifications(adminNotifications, tx);
    }

    await this.auditService.createAuditLog(
      parsed.userId,
      "JOIN_REQUEST_SUBMITTED",
      "join_requests",
      requestId,
      `Submitted request to join organization ${token.organizationId}`,
      { token: parsed.tokenString, organizationId: token.organizationId, teamId: token.teamId },
      undefined,
      undefined,
      tx
    );

    return newRequest || null;
  }

  // 4. Review Join Request (Approve/Reject)
  /**
   * Approves or rejects a pending organization membership join request.
   * Adds the user to the organization (and team if specified) on approval.
   * 
   * @throws {Error} If request is not found or already reviewed.
   */
  async reviewJoinRequest(
    requestId: string,
    status: "approved" | "rejected",
    adminId: string,
    tx: DBInstance = db
  ): Promise<JoinRequest | JoinRequestSqlite | null> {
    const parsed = reviewJoinRequestSchema.parse({ requestId, status, adminId });
    const requestTable = tables.joinRequests;

    const [req] = await tx
      .select()
      .from(requestTable)
      .where(eq(requestTable.id, parsed.requestId))
      .limit(1);

    if (!req) {
      throw new Error("Join request not found");
    }

    if (req.status !== "pending") {
      throw new Error("Join request has already been reviewed");
    }

    const [updatedReq] = await tx
      .update(requestTable)
      .set({ status: parsed.status })
      .where(eq(requestTable.id, parsed.requestId))
      .returning();

    if (parsed.status === "approved") {
      // 1. Add user to organization
      await this.organizationService.addMember(req.organizationId, req.userId, "member", tx);

      // 2. Add user to team if specified
      if (req.teamId) {
        await this.teamService.addTeamMember(req.teamId, req.userId, "member", tx);
        const userTable = tables.user;
        await tx
          .update(userTable)
          .set({ last_active_team_id: req.teamId, updatedAt: new Date() })
          .where(eq(userTable.id, req.userId));
      }

      await this.notificationService.createNotification({
        userId: req.userId,
        title: "Request Approved",
        message: `Your request to join the organization has been approved.`,
        type: "team_switch",
        relatedId: req.organizationId,
      }, tx);

      await this.auditService.createAuditLog(
        parsed.adminId,
        "JOIN_REQUEST_APPROVED",
        "join_requests",
        parsed.requestId,
        `Approved join request of user ${req.userId} to organization ${req.organizationId}`,
        { requestId: parsed.requestId, userId: req.userId, organizationId: req.organizationId, teamId: req.teamId },
        undefined,
        undefined,
        tx
      );
    } else {
      await this.notificationService.createNotification({
        userId: req.userId,
        title: "Request Declined",
        message: `Your request to join the organization was declined.`,
        type: "team_switch",
        relatedId: req.organizationId,
      }, tx);

      await this.auditService.createAuditLog(
        parsed.adminId,
        "JOIN_REQUEST_REJECTED",
        "join_requests",
        parsed.requestId,
        `Declined join request of user ${req.userId} to organization ${req.organizationId}`,
        { requestId: parsed.requestId, userId: req.userId, organizationId: req.organizationId },
        undefined,
        undefined,
        tx
      );
    }

    return updatedReq || null;
  }

  /**
   * Validates a join token and returns the organization and team details.
   * 
   * @throws {TokenNotFoundError} If token does not exist.
   * @throws {TokenExpiredError} If token is expired.
   * @throws {TokenLimitReachedError} If token has reached its usage limit.
   */
  async validateJoinToken(
    tokenString: string,
    tx: DBInstance = db
  ): Promise<{
    valid: boolean;
    organizationId: string;
    organizationName: string;
    teamId: string | null;
    teamName: string | null;
    autoJoin: boolean;
  }> {
    z.string().parse(tokenString);
    const tokenTable = tables.joinTokens;

    const [tokenRecord] = await tx
      .select()
      .from(tokenTable)
      .where(eq(tokenTable.id, tokenString))
      .limit(1);

    if (!tokenRecord) {
      throw new TokenNotFoundError();
    }

    if (new Date() > new Date(tokenRecord.expiresAt)) {
      throw new TokenExpiredError();
    }

    if (tokenRecord.maxUses !== null && tokenRecord.usesCount >= tokenRecord.maxUses) {
      throw new TokenLimitReachedError();
    }

    const org = await this.organizationService.getOrganization(tokenRecord.organizationId, tx);
    const team = tokenRecord.teamId ? await this.teamService.getTeam(tokenRecord.teamId, tx) : null;

    return {
      valid: true,
      organizationId: tokenRecord.organizationId,
      organizationName: org?.name || "Unknown Workspace",
      teamId: tokenRecord.teamId,
      teamName: team?.name || null,
      autoJoin: tokenRecord.autoJoin,
    };
  }
}
