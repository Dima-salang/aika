import { db, isSQLite } from "@/db";
import {
  userSqlite,
  sessionSqlite,
  accountSqlite,
  verificationSqlite,
  organizationSqlite,
  memberSqlite,
  invitationSqlite,
  teamsSqlite,
  teamMembersSqlite,
  projectsSqlite,
  tasksSqlite,
  timeLogsSqlite,
  timeLogTasksSqlite,
  timersSqlite,
  documentEvidencesSqlite,
  notificationsSqlite,
  auditLogsSqlite,
} from "@/db/schema";
import { sql } from "drizzle-orm";

export async function clearDatabase() {
  if (isSQLite) {
    try {
      await db.run(sql`PRAGMA foreign_keys = OFF`);
    } catch (e) {
      // Ignore if PRAGMA is not supported or fails
    }
  }

  // Delete in correct order to respect foreign key constraints if active
  await db.delete(timeLogTasksSqlite);
  await db.delete(documentEvidencesSqlite);
  await db.delete(timeLogsSqlite);
  await db.delete(timersSqlite);
  await db.delete(tasksSqlite);
  await db.delete(projectsSqlite);
  await db.delete(teamMembersSqlite);
  await db.delete(teamsSqlite);
  await db.delete(memberSqlite);
  await db.delete(invitationSqlite);
  await db.delete(organizationSqlite);
  await db.delete(sessionSqlite);
  await db.delete(accountSqlite);
  await db.delete(verificationSqlite);
  await db.delete(auditLogsSqlite);
  await db.delete(notificationsSqlite);
  await db.delete(userSqlite);
}
