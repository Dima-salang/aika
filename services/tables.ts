import { isSQLite } from "@/db";
import * as schema from "@/db/schema";

export const tables = {
  get user() { return isSQLite ? schema.userSqlite : schema.user; },
  get session() { return isSQLite ? schema.sessionSqlite : schema.session; },
  get account() { return isSQLite ? schema.accountSqlite : schema.account; },
  get verification() { return isSQLite ? schema.verificationSqlite : schema.verification; },
  get organization() { return isSQLite ? schema.organizationSqlite : schema.organization; },
  get member() { return isSQLite ? schema.memberSqlite : schema.member; },
  get invitation() { return isSQLite ? schema.invitationSqlite : schema.invitation; },
  get teams() { return isSQLite ? schema.teamsSqlite : schema.teams; },
  get teamMembers() { return isSQLite ? schema.teamMembersSqlite : schema.teamMembers; },
  get projects() { return isSQLite ? schema.projectsSqlite : schema.projects; },
  get tasks() { return isSQLite ? schema.tasksSqlite : schema.tasks; },
  get timeLogs() { return isSQLite ? schema.timeLogsSqlite : schema.timeLogs; },
  get timeLogTasks() { return isSQLite ? schema.timeLogTasksSqlite : schema.timeLogTasks; },
  get timers() { return isSQLite ? schema.timersSqlite : schema.timers; },
  get documentEvidences() { return isSQLite ? schema.documentEvidencesSqlite : schema.documentEvidences; },
  get notifications() { return isSQLite ? schema.notificationsSqlite : schema.notifications; },
  get auditLogs() { return isSQLite ? schema.auditLogsSqlite : schema.auditLogs; },
  get joinTokens() { return isSQLite ? schema.joinTokensSqlite : schema.joinTokens; },
  get joinRequests() { return isSQLite ? schema.joinRequestsSqlite : schema.joinRequests; },
};
