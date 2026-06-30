import { isSQLite } from "@/db";
import * as schema from "@/db/schema";

export const tables = {
  get user() { return (isSQLite ? schema.userSqlite : schema.user) as unknown as typeof schema.user; },
  get session() { return (isSQLite ? schema.sessionSqlite : schema.session) as unknown as typeof schema.session; },
  get account() { return (isSQLite ? schema.accountSqlite : schema.account) as unknown as typeof schema.account; },
  get verification() { return (isSQLite ? schema.verificationSqlite : schema.verification) as unknown as typeof schema.verification; },
  get organization() { return (isSQLite ? schema.organizationSqlite : schema.organization) as unknown as typeof schema.organization; },
  get member() { return (isSQLite ? schema.memberSqlite : schema.member) as unknown as typeof schema.member; },
  get invitation() { return (isSQLite ? schema.invitationSqlite : schema.invitation) as unknown as typeof schema.invitation; },
  get teams() { return (isSQLite ? schema.teamsSqlite : schema.teams) as unknown as typeof schema.teams; },
  get teamMembers() { return (isSQLite ? schema.teamMembersSqlite : schema.teamMembers) as unknown as typeof schema.teamMembers; },
  get projects() { return (isSQLite ? schema.projectsSqlite : schema.projects) as unknown as typeof schema.projects; },
  get tasks() { return (isSQLite ? schema.tasksSqlite : schema.tasks) as unknown as typeof schema.tasks; },
  get timeLogs() { return (isSQLite ? schema.timeLogsSqlite : schema.timeLogs) as unknown as typeof schema.timeLogs; },
  get timeLogTasks() { return (isSQLite ? schema.timeLogTasksSqlite : schema.timeLogTasks) as unknown as typeof schema.timeLogTasks; },
  get timers() { return (isSQLite ? schema.timersSqlite : schema.timers) as unknown as typeof schema.timers; },
  get documentEvidences() { return (isSQLite ? schema.documentEvidencesSqlite : schema.documentEvidences) as unknown as typeof schema.documentEvidences; },
  get notifications() { return (isSQLite ? schema.notificationsSqlite : schema.notifications) as unknown as typeof schema.notifications; },
  get auditLogs() { return (isSQLite ? schema.auditLogsSqlite : schema.auditLogs) as unknown as typeof schema.auditLogs; },
  get joinTokens() { return (isSQLite ? schema.joinTokensSqlite : schema.joinTokens) as unknown as typeof schema.joinTokens; },
  get joinRequests() { return (isSQLite ? schema.joinRequestsSqlite : schema.joinRequests) as unknown as typeof schema.joinRequests; },
  get comments() { return (isSQLite ? schema.commentsSqlite : schema.comments) as unknown as typeof schema.comments; },
  get timeLogGithubLinks() { return (isSQLite ? schema.timeLogGithubLinksSqlite : schema.timeLogGithubLinks) as unknown as typeof schema.timeLogGithubLinks; },
};
