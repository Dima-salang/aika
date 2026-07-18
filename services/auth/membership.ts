import { and, eq, isNull } from "drizzle-orm";
import { db, DBInstance } from "@/db";
import { tables } from "@/db/tables";

/**
 * Assert the user is an active member of the organization (and team, when set).
 * Throws "Security Error: ..." so handleDbError maps it to FORBIDDEN.
 */
export async function assertOrgWriteAccess(
  userId: string,
  organizationId: string,
  teamId?: string | null,
  tx: DBInstance = db
): Promise<void> {
  if (organizationId === "org-default") {
    return;
  }

  const [member] = await tx
    .select({ id: tables.member.id })
    .from(tables.member)
    .where(
      and(
        eq(tables.member.userId, userId),
        eq(tables.member.organizationId, organizationId)
      )
    )
    .limit(1);

  if (!member) {
    throw new Error("Security Error: Not a member of this organization");
  }

  if (!teamId) {
    return;
  }

  const [team] = await tx
    .select({ id: tables.teams.id })
    .from(tables.teams)
    .where(
      and(
        eq(tables.teams.id, teamId),
        eq(tables.teams.organization_id, organizationId),
        isNull(tables.teams.deleted_at)
      )
    )
    .limit(1);

  if (!team) {
    throw new Error("Security Error: Team does not belong to this organization");
  }

  const [teamMember] = await tx
    .select({ id: tables.teamMembers.id })
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.team_id, teamId),
        eq(tables.teamMembers.user_id, userId),
        isNull(tables.teamMembers.deleted_at)
      )
    )
    .limit(1);

  if (!teamMember) {
    throw new Error("Security Error: Not a member of this team");
  }
}

export async function isOrgMember(
  userId: string,
  organizationId: string,
  tx: DBInstance = db
): Promise<boolean> {
  if (organizationId === "org-default") {
    return true;
  }

  const [member] = await tx
    .select({ id: tables.member.id })
    .from(tables.member)
    .where(
      and(
        eq(tables.member.userId, userId),
        eq(tables.member.organizationId, organizationId)
      )
    )
    .limit(1);
  return !!member;
}

