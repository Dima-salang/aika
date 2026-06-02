import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, isSQLite } from "@/db";
import {
  user,
  userSqlite,
  organization,
  organizationSqlite,
  teams,
  teamsSqlite,
  projects,
  projectsSqlite,
  tasks,
  tasksSqlite,
  timeLogs,
  timeLogsSqlite,
  notifications,
  notificationsSqlite,
  auditLogs,
  auditLogsSqlite,
} from "@/db/schema";
import { AdminShell } from "@/components/admin/admin-shell";
import { Shield, ArrowLeft } from "lucide-react";

export const revalidate = 0; // Ensure admin dashboard is always fresh and server-rendered on demand

export default async function AdminPage() {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  // Security authorization gate - server side check for ultra-fast, zero-leak validation
  if (!session || !session.user || !(session.user as any).is_admin) {
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
  const usersList = await db.select().from(isSQLite ? userSqlite : user);
  const orgsList = await db.select().from(isSQLite ? organizationSqlite : organization);
  const teamsList = await db.select().from(isSQLite ? teamsSqlite : teams);
  const projectsList = await db.select().from(isSQLite ? projectsSqlite : projects);
  const tasksList = await db.select().from(isSQLite ? tasksSqlite : tasks);
  const logsList = await db.select().from(isSQLite ? timeLogsSqlite : timeLogs);
  const notificationsList = await db.select().from(isSQLite ? notificationsSqlite : notifications);
  const auditLogsList = await db.select().from(isSQLite ? auditLogsSqlite : auditLogs);

  // Return the client component shell populated with instant server data!
  return (
    <AdminShell
      session={session}
      users={usersList}
      orgs={orgsList}
      teams={teamsList}
      projects={projectsList}
      tasks={tasksList}
      logs={logsList}
      notifications={notificationsList}
      auditLogs={auditLogsList}
    />
  );
}
