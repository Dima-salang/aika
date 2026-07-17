import { pgTable, text, timestamp, boolean, integer, primaryKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger, primaryKey as sqlitePrimaryKey, index as sqliteIndex, uniqueIndex as sqliteUniqueIndex } from "drizzle-orm/sqlite-core";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { createSelectSchema, createInsertSchema} from "drizzle-zod";

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
    notion_access_token: text("notion_access_token"),
    notion_database_id: text("notion_database_id"),
    notion_workspace_name: text("notion_workspace_name"),
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
    activeOrganizationId: text("activeOrganizationId"),
    activeTeamId: text("activeTeamId"),
}, (table) => [
    index("idx_session_user_id").on(table.userId),
]);

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
}, (table) => [
    index("idx_account_user_id").on(table.userId),
]);

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
}, (table) => [
    uniqueIndex("idx_member_org_user").on(table.organizationId, table.userId),
    index("idx_member_user").on(table.userId),
]);

// Better Auth: Invitation table (Tenant invites)
export const invitation = pgTable("invitation", {
    id: text("id").primaryKey(),
    organizationId: text("organizationId").notNull().references(() => organization.id),
    email: text("email").notNull(),
    role: text("role").notNull(),
    status: text("status").notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    inviterId: text("inviterId").notNull().references(() => user.id),
    teamId: text("teamId"),
}, (table) => [
    index("idx_invitation_org_id").on(table.organizationId),
]);

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
    role: text("role").notNull().default("member"), // 'leader' | 'member'
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
}, (table) => [
    uniqueIndex("idx_team_members_team_user").on(table.team_id, table.user_id),
    index("idx_team_members_user").on(table.user_id),
]);

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
    user_id: text("user_id").references(() => user.id),
}, (table) => [
    index("idx_projects_org").on(table.organization_id),
    index("idx_projects_team").on(table.team_id),
]);

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
}, (table) => [
    index("idx_tasks_org_team").on(table.organization_id, table.team_id),
    index("idx_tasks_user").on(table.user_id),
]);

// Time Logs
export const timeLogs = pgTable("time_logs", {
    id: text("id").primaryKey(),
    user_id: text("user_id").notNull().references(() => user.id),
    team_id: text("team_id").references(() => teams.id),
    organization_id: text("organization_id").notNull().references(() => organization.id),
    project_id: text("project_id").references(() => projects.id),
    start_time: timestamp("start_time").notNull(),
    end_time: timestamp("end_time").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
    notion_page_id: text("notion_page_id"),
    duration: integer("duration").notNull().default(0),
    is_public: boolean("is_public").default(false),
}, (table) => [
    index("idx_time_logs_user_start").on(table.user_id, sql`${table.start_time} DESC`).where(sql`deleted_at IS NULL`),
    index("idx_time_logs_team_start").on(table.team_id, sql`${table.start_time} DESC`).where(sql`deleted_at IS NULL`),
    index("idx_time_logs_org_team").on(table.organization_id, table.team_id),
]);

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
}, (table) => [
    index("idx_document_evidences_log_id").on(table.time_log_id),
]);

// Time Log GitHub Links
export const timeLogGithubLinks = pgTable("time_log_github_links", {
    id: text("id").primaryKey(),
    time_log_id: text("time_log_id").notNull().references(() => timeLogs.id),
    repo_name: text("repo_name").notNull(),
    link_type: text("link_type").notNull(), // 'commit' | 'pr'
    entity_id: text("entity_id").notNull(),  // SHA hash or PR number
    title: text("title").notNull(),
    url: text("url").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
    index("idx_github_links_log").on(table.time_log_id),
]);

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
}, (table) => [
    index("idx_notifications_user_read").on(table.user_id, table.is_read),
]);

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
}, (table) => [
    index("idx_audit_logs_user_created").on(table.user_id, sql`${table.created_at} DESC`),
]);

// Secure Join Tokens (self-service onboarding links)
export const joinTokens = pgTable("join_tokens", {
    id: text("id").primaryKey(), // The cryptographically secure token string
    organizationId: text("organization_id").notNull().references(() => organization.id),
    teamId: text("team_id").references(() => teams.id),
    createdBy: text("created_by").notNull().references(() => user.id),
    expiresAt: timestamp("expires_at").notNull(),
    maxUses: integer("max_uses"),
    usesCount: integer("uses_count").notNull().default(0),
    autoJoin: boolean("auto_join").notNull().default(false),
}, (table) => [
    index("idx_join_tokens_org").on(table.organizationId),
    index("idx_join_tokens_team").on(table.teamId),
]);

// Join Requests (requests submitted via join tokens for admin review)
export const joinRequests = pgTable("join_requests", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    organizationId: text("organization_id").notNull().references(() => organization.id),
    teamId: text("team_id").references(() => teams.id),
    status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
    createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
    index("idx_join_requests_org").on(table.organizationId),
    index("idx_join_requests_team").on(table.teamId),
    index("idx_join_requests_user").on(table.userId),
]);


export const comments = pgTable("comments", {
    id: text("id").primaryKey(),
    log_id: text("log_id").notNull().references(() => timeLogs.id),
    user_id: text("user_id").notNull().references(() => user.id),
    parent_id: text("parent_id").references((): any => comments.id),
    comment: text("comment").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
    deleted_at: timestamp("deleted_at"),
}, (table) => [
    //index on log_id with desc order
    index("idx_comments_log").on(desc(table.created_at)),
    index("idx_comments_user").on(table.user_id),
]);


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
    notion_access_token: sqliteText("notion_access_token"),
    notion_database_id: sqliteText("notion_database_id"),
    notion_workspace_name: sqliteText("notion_workspace_name"),
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
    activeOrganizationId: sqliteText("activeOrganizationId"),
    activeTeamId: sqliteText("activeTeamId"),
}, (table) => [
    sqliteIndex("idx_session_user_id_sqlite").on(table.userId),
]);

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
}, (table) => [
    sqliteIndex("idx_account_user_id_sqlite").on(table.userId),
]);

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
}, (table) => [
    sqliteUniqueIndex("idx_member_org_user_sqlite").on(table.organizationId, table.userId),
    sqliteIndex("idx_member_user_sqlite").on(table.userId),
]);

// Better Auth: Invitation table (Tenant invites)
export const invitationSqlite = sqliteTable("invitation", {
    id: sqliteText("id").primaryKey(),
    organizationId: sqliteText("organizationId").notNull().references(() => organizationSqlite.id),
    email: sqliteText("email").notNull(),
    role: sqliteText("role").notNull(),
    status: sqliteText("status").notNull(),
    expiresAt: sqliteInteger("expiresAt", { mode: "timestamp" }).notNull(),
    inviterId: sqliteText("inviterId").notNull().references(() => userSqlite.id),
    teamId: sqliteText("teamId"),
}, (table) => [
    sqliteIndex("idx_invitation_org_id_sqlite").on(table.organizationId),
]);

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
    role: sqliteText("role").notNull().default("member"),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
}, (table) => [
    sqliteUniqueIndex("idx_team_members_team_user_sqlite").on(table.team_id, table.user_id),
    sqliteIndex("idx_team_members_user_sqlite").on(table.user_id),
]);

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
    user_id: sqliteText("user_id").references(() => userSqlite.id),
}, (table) => [
    sqliteIndex("idx_projects_org_sqlite").on(table.organization_id),
    sqliteIndex("idx_projects_team_sqlite").on(table.team_id),
]);

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
}, (table) => [
    sqliteIndex("idx_tasks_org_team_sqlite").on(table.organization_id, table.team_id),
    sqliteIndex("idx_tasks_user_sqlite").on(table.user_id),
]);

// Time Logs
export const timeLogsSqlite = sqliteTable("time_logs", {
    id: sqliteText("id").primaryKey(),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    team_id: sqliteText("team_id").references(() => teamsSqlite.id),
    organization_id: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    project_id: sqliteText("project_id").references(() => projectsSqlite.id),
    start_time: sqliteInteger("start_time", { mode: "timestamp" }).notNull(),
    end_time: sqliteInteger("end_time", { mode: "timestamp" }).notNull(),
    title: sqliteText("title").notNull().default(""),
    description: sqliteText("description").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
    notion_page_id: sqliteText("notion_page_id"),
    duration: sqliteInteger("duration").notNull().default(0),
    is_public: sqliteInteger("is_public", { mode: "boolean" }).default(false),
}, (table) => [
    sqliteIndex("idx_time_logs_user_start_sqlite").on(table.user_id, sql`${table.start_time} DESC`),
    sqliteIndex("idx_time_logs_team_start_sqlite").on(table.team_id, sql`${table.start_time} DESC`),
    sqliteIndex("idx_time_logs_org_team_sqlite").on(table.organization_id, table.team_id),
]);

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
}, (table) => [
    sqliteIndex("idx_document_evidences_log_id_sqlite").on(table.time_log_id),
]);

// Time Log GitHub Links (SQLite)
export const timeLogGithubLinksSqlite = sqliteTable("time_log_github_links", {
    id: sqliteText("id").primaryKey(),
    time_log_id: sqliteText("time_log_id").notNull().references(() => timeLogsSqlite.id),
    repo_name: sqliteText("repo_name").notNull(),
    link_type: sqliteText("link_type").notNull(), // 'commit' | 'pr'
    entity_id: sqliteText("entity_id").notNull(),
    title: sqliteText("title").notNull(),
    url: sqliteText("url").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (table) => [
    sqliteIndex("idx_github_links_log_sqlite").on(table.time_log_id),
]);

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
}, (table) => [
    sqliteIndex("idx_notifications_user_read_sqlite").on(table.user_id, table.is_read),
]);

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
}, (table) => [
    sqliteIndex("idx_audit_logs_user_created_sqlite").on(table.user_id, sql`${table.created_at} DESC`),
]);

// Secure Join Tokens (self-service onboarding links)
export const joinTokensSqlite = sqliteTable("join_tokens", {
    id: sqliteText("id").primaryKey(),
    organizationId: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    teamId: sqliteText("team_id").references(() => teamsSqlite.id),
    createdBy: sqliteText("created_by").notNull().references(() => userSqlite.id),
    expiresAt: sqliteInteger("expires_at", { mode: "timestamp" }).notNull(),
    maxUses: sqliteInteger("max_uses"),
    usesCount: sqliteInteger("uses_count").notNull().default(0),
    autoJoin: sqliteInteger("auto_join", { mode: "boolean" }).notNull().default(false),
}, (table) => [
    sqliteIndex("idx_join_tokens_org_sqlite").on(table.organizationId),
    sqliteIndex("idx_join_tokens_team_sqlite").on(table.teamId),
]);

// Join Requests (requests submitted via join tokens for admin review)
export const joinRequestsSqlite = sqliteTable("join_requests", {
    id: sqliteText("id").primaryKey(),
    userId: sqliteText("user_id").notNull().references(() => userSqlite.id),
    organizationId: sqliteText("organization_id").notNull().references(() => organizationSqlite.id),
    teamId: sqliteText("team_id").references(() => teamsSqlite.id),
    status: sqliteText("status").notNull().default("pending"),
    createdAt: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
}, (table) => [
    sqliteIndex("idx_join_requests_org_sqlite").on(table.organizationId),
    sqliteIndex("idx_join_requests_team_sqlite").on(table.teamId),
    sqliteIndex("idx_join_requests_user_sqlite").on(table.userId),
]);

export const commentsSqlite = sqliteTable("comments", {
    id: sqliteText("id").primaryKey(),
    log_id: sqliteText("log_id").notNull().references(() => timeLogsSqlite.id),
    user_id: sqliteText("user_id").notNull().references(() => userSqlite.id),
    parent_id: sqliteText("parent_id").references((): any => commentsSqlite.id),
    comment: sqliteText("comment").notNull(),
    created_at: sqliteInteger("created_at", { mode: "timestamp" }).notNull().defaultNow(),
    updated_at: sqliteInteger("updated_at", { mode: "timestamp" }).notNull().defaultNow(),
    deleted_at: sqliteInteger("deleted_at", { mode: "timestamp" }),
}, (table) => [
    sqliteIndex("idx_comments_log_sqlite").on(table.log_id),
    sqliteIndex("idx_comments_user_sqlite").on(table.user_id),
]);


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
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type TimeLogGithubLink = typeof timeLogGithubLinks.$inferSelect;
export type NewTimeLogGithubLink = typeof timeLogGithubLinks.$inferInsert;

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
export type JoinToken = typeof joinTokens.$inferSelect;
export type NewJoinToken = typeof joinTokens.$inferInsert;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type NewJoinRequest = typeof joinRequests.$inferInsert;
export type JoinTokenSqlite = typeof joinTokensSqlite.$inferSelect;
export type NewJoinTokenSqlite = typeof joinTokensSqlite.$inferInsert;
export type JoinRequestSqlite = typeof joinRequestsSqlite.$inferSelect;
export type NewJoinRequestSqlite = typeof joinRequestsSqlite.$inferInsert;
export type CommentSqlite = typeof commentsSqlite.$inferSelect;
export type NewCommentSqlite = typeof commentsSqlite.$inferInsert;
export type TimeLogGithubLinkSqlite = typeof timeLogGithubLinksSqlite.$inferSelect;
export type NewTimeLogGithubLinkSqlite = typeof timeLogGithubLinksSqlite.$inferInsert;

// ==========================================
// 4. ZOD SCHEMA SCHEMAS
// ==========================================

// Pagination Schema
export const paginationInputZodSchema = z.object({
  limit: z.number().positive().int().optional().default(10),
  offset: z.number().nonnegative().int().optional().default(0),
});

export type PaginationInput = z.input<typeof paginationInputZodSchema>;



export const userZodSchema = createSelectSchema(user, {
  email: z.email(),
});
export const newUserZodSchema = createInsertSchema(user, {
  email: z.email(),
}).omit({ createdAt: true, updatedAt: true }).partial({
  id: true,
  emailVerified: true,
  is_admin: true,
});

export const sessionZodSchema = createSelectSchema(session);

export const organizationZodSchema = createSelectSchema(organization, {
  name: z.string().min(1),
  slug: z.string().min(1),
});
export const newOrganizationZodSchema = createInsertSchema(organization, {
  name: z.string().min(1),
  slug: z.string().min(1),
}).omit({ createdAt: true }).partial({
  id: true,
});

export const memberZodSchema = createSelectSchema(member);

export const teamZodSchema = createSelectSchema(teams, {
  name: z.string().min(1),
});
export const newTeamZodSchema = createInsertSchema(teams, {
  name: z.string().min(1),
}).omit({ created_at: true, updated_at: true }).partial({
  id: true,
});

export const teamMemberZodSchema = createSelectSchema(teamMembers, {
  role: z.enum(["leader", "member"]),
});

export const projectZodSchema = createSelectSchema(projects, {
  name: z.string().min(1),
});
export const newProjectZodSchema = createInsertSchema(projects, {
  name: z.string().min(1),
}).omit({ created_at: true, updated_at: true }).partial({
  id: true,
});

export const taskZodSchema = createSelectSchema(tasks, {
  title: z.string().min(1),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
});
export const newTaskZodSchema = createInsertSchema(tasks, {
  title: z.string().min(1),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
}).omit({ created_at: true, updated_at: true }).partial({
  id: true,
  status: true,
});

export const timeLogZodSchema = createSelectSchema(timeLogs, {
  title: z.string().min(1),
  description: z.string(),
});
export const newTimeLogZodSchema = createInsertSchema(timeLogs, {
  title: z.string().min(1),
  description: z.string().optional().default(""),
}).omit({ created_at: true, updated_at: true }).partial({
  id: true,
});

export const timerZodSchema = createSelectSchema(timers);
export const newTimerZodSchema = createInsertSchema(timers).omit({ created_at: true }).partial({
  start_time: true,
});

export const documentEvidenceZodSchema = createSelectSchema(documentEvidences, {
  file_url: z.string().url(),
  file_size: z.number().int().positive(),
});
export const newDocumentEvidenceZodSchema = createInsertSchema(documentEvidences, {
  file_url: z.string().url(),
  file_size: z.number().int().positive(),
}).omit({ created_at: true }).partial({
  id: true,
});

export const notificationZodSchema = createSelectSchema(notifications, {
  type: z.enum(["team_invitation", "task_update", "time_log", "team_switch"]),
});

export const auditLogZodSchema = createSelectSchema(auditLogs);
export const newAuditLogZodSchema = createInsertSchema(auditLogs).omit({ created_at: true }).partial({
  id: true,
});

export const joinTokenZodSchema = createSelectSchema(joinTokens, {
  maxUses: z.number().int().positive().nullable().optional(),
  usesCount: z.number().int().nonnegative(),
});

export const joinRequestZodSchema = createSelectSchema(joinRequests, {
  status: z.enum(["pending", "approved", "rejected"]),
});

// ==========================================
// 5. INPUT/OUTPUT LOG VARIATIONS (ZOD)
// ==========================================

export const evidenceInputSchema = z.object({
  fileUrl: z.string().url(),
  fileKey: z.string(),
  fileName: z.string(),
  fileSize: z.number().int().positive(),
  mimeType: z.string(),
});

export const githubLinkInputSchema = z.object({
  repoName: z.string(),
  linkType: z.enum(["commit", "pr"]),
  entityId: z.string(),
  title: z.string(),
  url: z.string().url(),
});

export const createLogInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  title: z.string().min(1).optional().default("Untitled Task"),
  description: z.string().optional().default(""),
  taskIds: z.array(z.string()).optional(),
  evidence: z.array(evidenceInputSchema).optional().default([]),
  isPublic: z.boolean().optional(),
  githubLinks: z.array(githubLinkInputSchema).optional().default([]),
});

export const updateLogInputZodSchema = z.object({
  organizationId: z.string().optional(),
  teamId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
  evidence: z.array(evidenceInputSchema).optional(),
  isPublic: z.boolean().optional(),
  githubLinks: z.array(githubLinkInputSchema).optional(),
});

export const readLogZodSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  team_id: z.string().nullable(),
  organization_id: z.string(),
  project_id: z.string().nullable(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  title: z.string(),
  description: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable(),
  duration: z.number(),
  is_public: z.boolean().nullable().optional(),
  tasks: z.array(z.string()),
  evidence: z.array(
    z.object({
      id: z.string(),
      time_log_id: z.string(),
      file_url: z.string(),
      file_key: z.string(),
      file_name: z.string(),
      file_size: z.number(),
      mime_type: z.string(),
      created_at: z.coerce.date(),
      deleted_at: z.coerce.date().nullable(),
    })
  ),
  githubLinks: z.array(
    z.object({
      id: z.string(),
      time_log_id: z.string(),
      repo_name: z.string(),
      link_type: z.string(),
      entity_id: z.string(),
      title: z.string(),
      url: z.string(),
      created_at: z.coerce.date(),
    })
  ).optional().default([]),
});

export type CreateLogInput = Omit<z.infer<typeof createLogInputZodSchema>, "title" | "githubLinks"> & { title?: string; githubLinks?: z.infer<typeof githubLinkInputSchema>[] };
export type UpdateLogInput = Omit<z.infer<typeof updateLogInputZodSchema>, "title"> & { title?: string };
export type ReadLog = z.infer<typeof readLogZodSchema>;

// User inputs & filters
export const createUserInputZodSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  image: z.string().nullable().optional(),
  is_admin: z.boolean().optional(),
  last_active_team_id: z.string().nullable().optional(),
});
export const updateUserInputZodSchema = createUserInputZodSchema.partial().omit({ id: true });
export const userFilterZodSchema = z.object({
  email: z.string().email().optional(),
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
  deleted: z.boolean().optional(),
});

// Team inputs & filters
export const createTeamInputZodSchema = z.object({
  id: z.string(),
  organization_id: z.string(),
  name: z.string().min(1),
});
export const updateTeamInputZodSchema = createTeamInputZodSchema.partial().omit({ id: true, organization_id: true });
export const teamFilterZodSchema = z.object({
  id: z.string().optional(),
  organizationId: z.string().optional(),
  organizations: z.array(z.string()).optional(),
  deleted: z.boolean().optional(),
});

// Organization inputs & filters
export const createOrganizationInputZodSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  logo: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
});
export const updateOrganizationInputZodSchema = createOrganizationInputZodSchema.partial().omit({ id: true });
export const organizationFilterZodSchema = z.object({
  slug: z.string().optional(),
  metadataSearch: z.string().optional(),
});

// Project inputs & filters
export const createProjectInputZodSchema = z.object({
  id: z.string(),
  team_id: z.string().nullable().optional(),
  organization_id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  start_date: z.coerce.date().nullable().optional(),
  end_date: z.coerce.date().nullable().optional(),
});
export const updateProjectInputZodSchema = createProjectInputZodSchema.partial().omit({ id: true, organization_id: true });
export const projectFilterZodSchema = z.object({
  id: z.string().optional(),
  teamId: z.string().nullable().optional(),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  deleted: z.boolean().optional(),
});

// Task inputs & filters
export const createTaskInputZodSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  due_date: z.coerce.date().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
  project_id: z.string().nullable().optional(),
  user_id: z.string(),
  team_id: z.string().nullable().optional(),
  organization_id: z.string(),
});
export const updateTaskInputZodSchema = createTaskInputZodSchema.partial().omit({ id: true, organization_id: true });
export const taskFilterZodSchema = z.object({
  id: z.string().optional(),
  projectId: z.string().nullable().optional(),
  userId: z.string().optional(),
  teamId: z.string().nullable().optional(),
  organizationId: z.string().optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  deleted: z.boolean().optional(),
});

// ==========================================
// 6. SHARED TRPC ROUTER INPUT SCHEMAS
// ==========================================

export const idInputZodSchema = z.object({
  id: z.string(),
});

export const userIdInputZodSchema = z.object({
  userId: z.string(),
});

export const tokenInputZodSchema = z.object({
  token: z.string(),
});

export const tokenAndUserIdInputZodSchema = z.object({
  token: z.string(),
  userId: z.string(),
});

export const orgIdAndTeamIdInputZodSchema = z.object({
  organizationId: z.string().optional(),
  teamId: z.string().optional(),
});

export const logIdAndUserIdInputZodSchema = z.object({
  logId: z.string(),
  userId: z.string(),
});

export const updateLogParentInputZodSchema = z.object({
  logId: z.string(),
  userId: z.string(),
  input: updateLogInputZodSchema,
});

export const getUserLogsInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  projectId: z.string().nullable().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  cursor: z.number().nullish(),
});

export const startTimerInputZodSchema = z.object({
  userId: z.string(),
  projectId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export const stopTimerInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamId: z.string().nullable().optional(),
  taskIds: z.array(z.string()),
  evidence: z.array(
    z.object({
      fileUrl: z.string(),
      fileKey: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
    })
  ),
  projectId: z.string().nullable().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  githubLinks: z.array(githubLinkInputSchema).optional().default([]),
});

export const getPersonalReportInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  teamIdFilter: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getTeamReportInputZodSchema = z.object({
  requestingUserId: z.string(),
  organizationId: z.string(),
  teamId: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const getTeamTimelineInputZodSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  role: z.string().optional(),
  selectedUser: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  cursor: z.number().nullish(),
});

export const getTeamMembersInputZodSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
});

export const removeTeamMemberInputZodSchema = z.object({
  userId: z.string(),
  teamId: z.string(),
  memberIdToRemove: z.string(),
});

export const getUserTeamsInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
});

export const setActiveTeamInputZodSchema = z.object({
  userId: z.string(),
  teamId: z.string().nullable(),
});

export const getProjectsInputZodSchema = z.object({
  organizationId: z.string(),
  teamId: z.string().nullable().optional(),
  pagination: paginationInputZodSchema.optional().default({ limit: 10, offset: 0 }),
});

export const getTasksInputZodSchema = z.object({
  userId: z.string(),
  pagination: paginationInputZodSchema.optional().default({ limit: 10, offset: 0 }),
});

export const createJoinTokenInputZodSchema = z.object({
  organizationId: z.string(),
  teamId: z.string().nullable(),
  createdBy: z.string(),
  expiresInSeconds: z.number().int().positive().default(86400),
  maxUses: z.number().int().positive().nullable().optional(),
  autoJoin: z.boolean().default(false),
});

export const reviewJoinRequestInputZodSchema = z.object({
  requestId: z.string(),
  status: z.enum(["approved", "rejected"]),
  adminId: z.string(),
});

export const getProjectInputZodSchema = projectZodSchema.pick({ id: true });
export const getLogInputZodSchema = z.object({
  id: z.string(),
});

export const updateUserMembershipsInputZodSchema = z.object({
  userId: z.string(),
  organizationId: z.string().nullable(),
  orgRole: z.string().nullable(),
  teamId: z.string().nullable(),
  teamRole: z.enum(["leader", "member"]).nullable(),
});

export const createProjectRouterInputZodSchema = newProjectZodSchema.extend({
  userId: z.string().optional(),
});

export const updateUserRouterInputZodSchema = userZodSchema.partial().required({ id: true });
export const updateOrganizationRouterInputZodSchema = organizationZodSchema.partial().required({ id: true });
export const updateTeamRouterInputZodSchema = teamZodSchema.partial().required({ id: true });
export const updateProjectRouterInputZodSchema = projectZodSchema.partial().required({ id: true });
export const updateTaskRouterInputZodSchema = taskZodSchema.partial().required({ id: true });
export const updateTimeLogRouterInputZodSchema = timeLogZodSchema.partial().required({ id: true });
export const updateNotificationRouterInputZodSchema = notificationZodSchema.partial().required({ id: true });




