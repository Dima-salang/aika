import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { Shield, ArrowLeft } from "lucide-react";
import { eq, inArray, and, or } from "drizzle-orm";
import { tables } from "@/db/tables";

export const revalidate = 0; // Ensure admin dashboard is always fresh and server-rendered on demand

export default async function AdminPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session || !session.user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/30 text-red-500 flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white">Authentication Required</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Please sign in to access the administrator tools.
            </p>
          </div>
          <Link href="/">
            <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-xl transition-all shadow-md shadow-zinc-900/10 cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Back to Workspace
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const userTableCheck = tables.user;
  const [dbUser] = await db
    .select()
    .from(userTableCheck)
    .where(eq(userTableCheck.id, session.user.id))
    .limit(1);

  const isSysAdmin = dbUser?.is_admin === true;

  // Query organization admin/owner memberships
  const memberTable = tables.member;
  const userMemberships = await db
    .select()
    .from(memberTable)
    .where(
      and(
        eq(memberTable.userId, session.user.id),
        or(
          eq(memberTable.role, "admin"),
          eq(memberTable.role, "owner"),
          eq(memberTable.role, "system_admin")
        )
      )
    );

  const adminOrgIds = userMemberships.map((m) => m.organizationId);

  // Security authorization gate - server side check for system admin or organization admin/owner
  if (!isSysAdmin && adminOrgIds.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/30 text-red-500 flex items-center justify-center mx-auto">
            <Shield className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-zinc-900 dark:text-white">Administrative Access Denied</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your account lacks the privileges required to access the system database shell.
            </p>
          </div>
          <Link href="/">
            <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-bold rounded-xl transition-all shadow-md shadow-zinc-900/10 cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Back to Workspace
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // Pre-fetch all tables directly on the server to achieve instant pre-rendering (SSR)
  const orgTable = tables.organization;
  const teamTable = tables.teams;
  const projectTable = tables.projects;
  const taskTable = tables.tasks;
  const logTable = tables.timeLogs;
  const notifTable = tables.notifications;
  const auditTable = tables.auditLogs;
  const userTable = tables.user;
  const tokenTable = tables.joinTokens;
  const reqTable = tables.joinRequests;

  let usersList: any[] = [];
  let orgsList: any[] = [];
  let teamsList: any[] = [];
  let projectsList: any[] = [];
  let tasksList: any[] = [];
  let logsList: any[] = [];
  let notificationsList: any[] = [];
  let auditLogsList: any[] = [];
  let tokensList: any[] = [];
  let requestsList: any[] = [];

  if (isSysAdmin) {
    usersList = await db.select().from(userTable);
    orgsList = await db.select().from(orgTable);
    teamsList = await db.select().from(teamTable);
    projectsList = await db.select().from(projectTable);
    tasksList = await db.select().from(taskTable);
    logsList = await db.select().from(logTable);
    notificationsList = await db.select().from(notifTable);
    auditLogsList = await db.select().from(auditTable);
    tokensList = await db.select().from(tokenTable);
    requestsList = await db.select().from(reqTable);
  } else {
    // Scoped queries
    orgsList = await db.select().from(orgTable).where(inArray(orgTable.id, adminOrgIds));
    teamsList = await db.select().from(teamTable).where(inArray(teamTable.organization_id, adminOrgIds));
    projectsList = await db.select().from(projectTable).where(inArray(projectTable.organization_id, adminOrgIds));
    tasksList = await db.select().from(taskTable).where(inArray(taskTable.organization_id, adminOrgIds));
    logsList = await db.select().from(logTable).where(inArray(logTable.organization_id, adminOrgIds));

    // Get all user memberships in these orgs
    const memberships = await db.select().from(memberTable).where(inArray(memberTable.organizationId, adminOrgIds));
    const allowedUserIds = memberships.map((m) => m.userId);

    if (allowedUserIds.length > 0) {
      usersList = await db.select().from(userTable).where(inArray(userTable.id, allowedUserIds));
      notificationsList = await db.select().from(notifTable).where(inArray(notifTable.user_id, allowedUserIds));
      auditLogsList = await db.select().from(auditTable).where(inArray(auditTable.user_id, allowedUserIds));
    }

    tokensList = await db.select().from(tokenTable).where(inArray(tokenTable.organizationId, adminOrgIds));
    requestsList = await db.select().from(reqTable).where(inArray(reqTable.organizationId, adminOrgIds));
  }

  // Return the client component shell populated with instant server data!
  return (
    <AdminShell
      session={session}
      isSysAdmin={isSysAdmin}
      users={usersList}
      orgs={orgsList}
      teams={teamsList}
      projects={projectsList}
      tasks={tasksList}
      logs={logsList}
      notifications={notificationsList}
      auditLogs={auditLogsList}
      initialTokens={tokensList}
      initialRequests={requestsList}
    />
  );
}
