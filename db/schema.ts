import { pgTable, text, timestamp, boolean, integer, primaryKey } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger, primaryKey as sqlitePrimaryKey } from "drizzle-orm/sqlite-core";

// ==========================================
// 1. POSTGRESQL SCHEMA DEFINITIONS
// ==========================================

// Better Auth: User table
export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("emailVerified").notNull(),
    image: text("image"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    
    is_admin: boolean("is_admin").notNull().default(false),
    last_active_team_id: text("last_active_team_id"),
    deleted_at: timestamp("deleted_at"),
});

// Better Auth: Session table
export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId").notNull().references(() => user.id),
});

// Better Auth: Account table
export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId").notNull().references(() => user.id),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
});

// Better Auth: Verification table
export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    createdAt: timestamp("createdAt"),
    updatedAt: timestamp("updatedAt"),
});

// Better Auth: Organization table (Tenant)
export const organization = pgTable("organization", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    createdAt: timestamp("createdAt").notNull(),
    metadata: text("metadata"),
});

// Better Auth: Member table (Tenant membership)
export const member = pgTable("member", {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull().references(() => organization.id),
    userId: text("userId").notNull().references(() => user.id),
    role: text("role").notNull(),
    createdAt: timestamp("createdAt").notNull(),
});

// Better Auth: Invitation table (Tenant invites)
export const invitation = pgTable("invitation", {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull().references(() => organization.id),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    inviterId: text("inviterId").notNull().references(() => user.id),
});

// Custom Aika: Teams table (Nested inside Organization)
export const teams = pgTable("teams", {
    id: text("id").primaryKey(),
    organization_id: text("organization_id").notNull().references(() => organization.id),
    name: text("name").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Custom Aika: Team Members table
export const teamMembers = pgTable("team_members", {
    id: text("id").primaryKey(),
    team_id: text("team_id").notNull().references(() => teams.id),
    user_id: text("user_id").notNull().references(() => user.id),
    role: text("role").notNull(), // 'leader' | 'member'
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Projects
export const projects = pgTable("projects", {
    id: text("id").primaryKey(),
    team_id: text("team_id").references(() => teams.id),
    organization_id: text("organization_id").notNull().references(() => organization.id),
    name: text("name").notNull(),
    description: text("description"),
    start_date: timestamp("start_date"),
    end_date: timestamp("end_date"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Tasks
export const tasks = pgTable("tasks", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").notNull(), // 'todo' | 'in_progress' | 'done'
    due_date: timestamp("due_date"),
    priority: text("priority"), // 'low' | 'medium' | 'high'
    project_id: text("project_id").references(() => projects.id),
    user_id: text("user_id").notNull().references(() => user.id),
    team_id: text("team_id").references(() => teams.id),
    organization_id: text("organization_id").notNull().references(() => organization.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Time Logs
export const timeLogs = pgTable("time_logs", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => user.id),
    team_id: text("team_id").references(() => teams.id),
    organization_id: text("organization_id").notNull().references(() => organization.id),
    project_id: text("project_id").references(() => projects.id),
    start_time: timestamp("start_time").notNull(),
    end_time: timestamp("end_time").notNull(),
    description: text("description").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Time Log Tasks (Many-to-Many Join Table)
export const timeLogTasks = pgTable("time_log_tasks", {
    time_log_id: text("time_log_id").notNull().references(() => timeLogs.id),
    task_id: text("task_id").notNull().references(() => tasks.id),
}, (t) => [
    primaryKey({ columns: [t.time_log_id, t.task_id] })
]);

// Timers (one active running timer per user)
export const timers = pgTable("timers", {
    user_id: text("user_id").primaryKey().references(() => user.id),
    start_time: timestamp("start_time").notNull(),
    description: text("description"),
    project_id: text("project_id").references(() => projects.id),
    created_at: timestamp("created_at").notNull().defaultNow(),
});

// Document Evidences (file attachments for time logs)
export const documentEvidences = pgTable("document_evidences", {
    id: text("id").primaryKey(),
    time_log_id: text("time_log_id").notNull().references(() => timeLogs.id),
    file_url: text("file_url").notNull(),
    file_key: text("file_key").notNull(),
    file_name: text("file_name").notNull(),
    file_size: integer("file_size").notNull(),
    mime_type: text("mime_type").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Notifications
export const notifications = pgTable("notifications", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => user.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(), // 'team_invitation' | 'task_update' | 'time_log' | 'team_switch'
    is_read: boolean("is_read").notNull().default(false),
    related_id: text("related_id"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
});

// Audit Logs (immutable mutation events only)
export const auditLogs = pgTable("audit_logs", {
    id: text("id").primaryKey(),
    user_id: text("user_id").references(() => user.id),
    event: text("event").notNull(),
    table_name: text("table_name"),
    record_id: text("record_id"),
    description: text("description").notNull(),
    ip_address: text("ip_address"),
    user_agent: text("user_agent"),
    payload: text("payload"),
    created_at: timestamp("created_at").notNull().defaultNow(),
});


// ==========================================
// 2. SQLITE SCHEMA DEFINITIONS (TESTING)
// ==========================================

// Better Auth: User table
export const userSqlite = sqliteTable("user", {
    id: sqliteText("id").primaryKey(),
    name: sqliteText("name").notNull(),
    email: sqliteText("email").notNull().unique(),
    emailVerified: sqliteInteger("emailVerified", { mode: "boolean" }).notNull(),
    image: sqliteText("image"),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).notNull(),
    
    // Custom columns for Aika
    is_admin: sqliteInteger("is_admin", { mode: "boolean" }).notNull().default(false),
    last_active_team_id: sqliteText("last_active_team_id"),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Better Auth: Session table
export const sessionSqlite = sqliteTable("session", {
    id: sqliteText("id").primaryKey(),
    expiresAt: sqliteInteger("expiresAt", { mode: "timestamp" }).notNull(),
    token: sqliteText("token").notNull().unique(),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).notNull(),
    ipAddress: sqliteText("ipAddress"),
    userAgent: sqliteText("userAgent"),
    userId: sqliteText("userId").notNull().references(() => userSqlite.id),
});

// Better Auth: Account table
export const accountSqlite = sqliteTable("account", {
    id: sqliteText("id").primaryKey(),
    accountId: sqliteText("accountId").notNull(),
    providerId: sqliteText("providerId").notNull(),
    userId: sqliteText("userId").notNull().references(() => userSqlite.id),
    accessToken: sqliteText("accessToken"),
    refreshToken: sqliteText("refreshToken"),
    idToken: sqliteText("idToken"),
    accessTokenExpiresAt: sqliteInteger("accessTokenExpiresAt", { mode: "timestamp" }),
    refreshTokenExpiresAt: sqliteInteger("refreshTokenExpiresAt", { mode: "timestamp" }),
    scope: sqliteText("scope"),
    password: sqliteText("password"),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }).notNull(),
});

// Better Auth: Verification table
export const verificationSqlite = sqliteTable("verification", {
    id: sqliteText("id").primaryKey(),
    identifier: sqliteText("identifier").notNull(),
    value: sqliteText("value").notNull(),
    expiresAt: sqliteInteger("expiresAt", { mode: "timestamp" }).notNull(),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }),
    updatedAt: sqliteInteger("updatedAt", { mode: "timestamp" }),
});

// Better Auth: Organization table (Tenant)
export const organizationSqlite = sqliteTable("organization", {
    id: sqliteText("id").primaryKey(),
    name: sqliteText("name").notNull(),
    slug: sqliteText("slug").notNull().unique(),
    logo: sqliteText("logo"),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).notNull(),
    metadata: sqliteText("metadata"),
});

// Better Auth: Member table (Tenant membership)
export const memberSqlite = sqliteTable("member", {
    id: sqliteText("id").primaryKey(),
    organizationId: sqliteText("organizationId").notNull().references(() => organizationSqlite.id),
    userId: sqliteText("userId").notNull().references(() => userSqlite.id),
    role: sqliteText("role").notNull(),
    createdAt: sqliteInteger("createdAt", { mode: "timestamp" }).notNull(),
});

// Better Auth: Invitation table (Tenant invites)
export const invitationSqlite = sqliteTable("invitation", {
    id: sqliteText("id").primaryKey(),
    organizationId: sqliteText("organizationId").notNull().references(() => organizationSqlite.id),
    email: sqliteText("email").notNull(),
    role: sqliteText("role").notNull(),
    status: sqliteText("status").notNull(),
    expiresAt: sqliteInteger("expiresAt", { mode: "timestamp" }).notNull(),
    inviterId: sqliteText("inviterId").notNull().references(() => userSqlite.id),
});

// Custom Aika: Teams table (Nested inside Organization)
export const teamsSqlite = sqliteTable("teams", {
    id: sqliteText("id").primaryKey(),
    organization_id: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    name: sqliteText("name").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Custom Aika: Team Members table
export const teamMembersSqlite = sqliteTable("team_members", {
    id: sqliteText("id").primaryKey(),
    team_id: sqliteText("team_id").notNull().references(() => teamsSqlite.id),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    role: sqliteText("role").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Projects
export const projectsSqlite = sqliteTable("projects", {
    id: sqliteText("id").primaryKey(),
    team_id: sqliteText("team_id").references(() => teamsSqlite.id),
    organization_id: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    name: sqliteText("name").notNull(),
    description: sqliteText("description"),
    start_date: sqliteInteger("start_date", { mode: "timestamp" }),
    end_date: sqliteInteger("end_date", { mode: "timestamp" }),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Tasks
export const tasksSqlite = sqliteTable("tasks", {
    id: sqliteText("id").primaryKey(),
    title: sqliteText("title").notNull(),
    description: sqliteText("description"),
    status: sqliteText("status").notNull(), // 'todo' | 'in_progress' | 'done'
    due_date: sqliteInteger("due_date", { mode: "timestamp" }),
    priority: sqliteText("priority"),
    project_id: sqliteText("project_id").references(() => projectsSqlite.id),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    team_id: sqliteText("team_id").references(() => teamsSqlite.id),
    organization_id: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Time Logs
export const timeLogsSqlite = sqliteTable("time_logs", {
    id: sqliteText("id").primaryKey(),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    team_id: sqliteText("team_id").references(() => teamsSqlite.id),
    organization_id: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    project_id: sqliteText("project_id").references(() => projectsSqlite.id),
    start_time: sqliteInteger("start_time", { mode: "timestamp" }).notNull(),
    end_time: sqliteInteger("end_time", { mode: "timestamp" }).notNull(),
    description: sqliteText("description").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Time Log Tasks (Many-to-Many Join Table)
export const timeLogTasksSqlite = sqliteTable("time_log_tasks", {
    time_log_id: sqliteText("time_log_id").notNull().references(() => timeLogsSqlite.id),
    task_id: sqliteText("task_id").notNull().references(() => tasksSqlite.id),
}, (t) => [
    sqlitePrimaryKey({ columns: [t.time_log_id, t.task_id] })
]);

// Timers (one active running timer per user)
export const timersSqlite = sqliteTable("timers", {
    user_id: sqliteText("user_id").primaryKey().references(() => userSqlite.id),
    start_time: sqliteInteger("start_time", { mode: "timestamp" }).notNull(),
    description: sqliteText("description"),
    project_id: sqliteText("project_id").references(() => projectsSqlite.id),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});

// Document Evidences (file attachments for time logs)
export const documentEvidencesSqlite = sqliteTable("document_evidences", {
    id: sqliteText("id").primaryKey(),
    time_log_id: sqliteText("time_log_id").notNull().references(() => timeLogsSqlite.id),
    file_url: sqliteText("file_url").notNull(),
    file_key: sqliteText("file_key").notNull(),
    file_name: sqliteText("file_name").notNull(),
    file_size: sqliteInteger("file_size").notNull(),
    mime_type: sqliteText("mime_type").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Notifications
export const notificationsSqlite = sqliteTable("notifications", {
    id: sqliteText("id").primaryKey(),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    title: sqliteText("title").notNull(),
    message: sqliteText("message").notNull(),
    type: sqliteText("type").notNull(), // 'team_invitation' | 'task_update' | 'time_log' | 'team_switch'
    is_read: sqliteInteger("is_read", { mode: "boolean" }).notNull().default(false),
    related_id: sqliteText("related_id"),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
});

// Audit Logs (immutable mutation events only)
export const auditLogsSqlite = sqliteTable("audit_logs", {
    id: sqliteText("id").primaryKey(),
    user_id: sqliteText("user_id").references(() => userSqlite.id),
    event: sqliteText("event").notNull(),
    table_name: sqliteText("table_name"),
    record_id: sqliteText("record_id"),
    description: sqliteText("description").notNull(),
    ip_address: sqliteText("ip_address"),
    user_agent: sqliteText("user_agent"),
    payload: sqliteText("payload"),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});


// ==========================================
// 3. DOMAIN TYPE INFERENCES
// ==========================================

// Postgres Types
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TimeLog = typeof timeLogs.$inferSelect;
export type NewTimeLog = typeof timeLogs.$inferInsert;
export type TimeLogTask = typeof timeLogTasks.$inferSelect;
export type NewTimeLogTask = typeof timeLogTasks.$inferInsert;
export type Timer = typeof timers.$inferSelect;
export type NewTimer = typeof timers.$inferInsert;
export type DocumentEvidence = typeof documentEvidences.$inferSelect;
export type NewDocumentEvidence = typeof documentEvidences.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// SQLite Types (for local test suites)
export type UserSqlite = typeof userSqlite.$inferSelect;
export type NewUserSqlite = typeof userSqlite.$inferInsert;
export type SessionSqlite = typeof sessionSqlite.$inferSelect;
export type NewSessionSqlite = typeof sessionSqlite.$inferInsert;
export type AccountSqlite = typeof accountSqlite.$inferSelect;
export type NewAccountSqlite = typeof accountSqlite.$inferInsert;
export type VerificationSqlite = typeof verificationSqlite.$inferSelect;
export type NewVerificationSqlite = typeof verificationSqlite.$inferInsert;
export type OrganizationSqlite = typeof organizationSqlite.$inferSelect;
export type NewOrganizationSqlite = typeof organizationSqlite.$inferInsert;
export type MemberSqlite = typeof memberSqlite.$inferSelect;
export type NewMemberSqlite = typeof memberSqlite.$inferInsert;
export type InvitationSqlite = typeof invitationSqlite.$inferSelect;
export type NewInvitationSqlite = typeof invitationSqlite.$inferInsert;
export type TeamSqlite = typeof teamsSqlite.$inferSelect;
export type NewTeamSqlite = typeof teamsSqlite.$inferInsert;
export type TeamMemberSqlite = typeof teamMembersSqlite.$inferSelect;
export type NewTeamMemberSqlite = typeof teamMembersSqlite.$inferInsert;
export type ProjectSqlite = typeof projectsSqlite.$inferSelect;
export type NewProjectSqlite = typeof projectsSqlite.$inferInsert;
export type TaskSqlite = typeof tasksSqlite.$inferSelect;
export type NewTaskSqlite = typeof tasksSqlite.$inferInsert;
export type TimeLogSqlite = typeof timeLogsSqlite.$inferSelect;
export type NewTimeLogSqlite = typeof timeLogsSqlite.$inferInsert;
export type TimeLogTaskSqlite = typeof timeLogTasksSqlite.$inferSelect;
export type NewTimeLogTaskSqlite = typeof timeLogTasksSqlite.$inferInsert;
export type TimerSqlite = typeof timersSqlite.$inferSelect;
export type NewTimerSqlite = typeof timersSqlite.$inferInsert;
export type DocumentEvidenceSqlite = typeof documentEvidencesSqlite.$inferSelect;
export type NewDocumentEvidenceSqlite = typeof documentEvidencesSqlite.$inferInsert;
export type NotificationSqlite = typeof notificationsSqlite.$inferSelect;
export type NewNotificationSqlite = typeof notificationsSqlite.$inferInsert;
export type AuditLogSqlite = typeof auditLogsSqlite.$inferSelect;
export type NewAuditLogSqlite = typeof auditLogsSqlite.$inferInsert;
