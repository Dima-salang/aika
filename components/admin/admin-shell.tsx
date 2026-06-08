"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { UsersManager } from "./users-manager";
import { OrganizationsManager } from "./organizations-manager";
import { TeamsManager } from "./teams-manager";
import { ProjectsManager } from "./projects-manager";
import { TasksManager } from "./tasks-manager";
import { TimeLogsManager } from "./timelogs-manager";
import { NotificationsManager } from "./notifications-manager";
import { AuditLogsViewer } from "./auditlogs-viewer";
import { OnboardingLinksManager } from "./onboarding-links-manager";
import { JoinRequestsManager } from "./join-requests-manager";
import {
  Shield,
  Users,
  Building,
  FolderKanban,
  CheckSquare,
  Clock,
  Bell,
  Activity,
  ArrowLeft,
  Sun,
  Moon,
  Layers,
  Link2,
  UserPlus,
} from "lucide-react";

type Section = "users" | "orgs" | "teams" | "projects" | "tasks" | "timelogs" | "notifications" | "auditlogs" | "tokens" | "requests";

interface AdminShellProps {
  session: any;
  users: any[];
  orgs: any[];
  teams: any[];
  projects: any[];
  tasks: any[];
  logs: any[];
  notifications: any[];
  auditLogs: any[];
  initialTokens: any[];
  initialRequests: any[];
}

export function AdminShell({
  session,
  users: initialUsers,
  orgs: initialOrgs,
  teams: initialTeams,
  projects: initialProjects,
  tasks: initialTasks,
  logs: initialLogs,
  notifications: initialNotifications,
  auditLogs: initialAuditLogs,
  initialTokens,
  initialRequests,
}: AdminShellProps) {
  const [activeSection, setActiveSection] = useState<Section>("users");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains("dark");
    setIsDark(isDarkClass);

    // Initial parsing of search params
    const searchParams = new URLSearchParams(window.location.search);
    const sectionParam = searchParams.get("section") as Section;
    const validSections: Section[] = ["users", "orgs", "teams", "projects", "tasks", "timelogs", "notifications", "auditlogs", "tokens", "requests"];
    if (sectionParam && validSections.includes(sectionParam)) {
      setActiveSection(sectionParam);
    }
  }, []);

  const handleSetActiveSection = (section: Section) => {
    setActiveSection(section);
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("section", section);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  };

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "users":
        return <UsersManager initialData={initialUsers} />;
      case "orgs":
        return <OrganizationsManager initialData={initialOrgs} />;
      case "teams":
        return <TeamsManager initialData={initialTeams} initialOrgs={initialOrgs} />;
      case "projects":
        return <ProjectsManager initialData={initialProjects} initialOrgs={initialOrgs} initialTeams={initialTeams} />;
      case "tasks":
        return <TasksManager initialData={initialTasks} initialUsers={initialUsers} initialOrgs={initialOrgs} initialProjects={initialProjects} initialTeams={initialTeams} />;
      case "timelogs":
        return <TimeLogsManager initialData={initialLogs} initialUsers={initialUsers} initialOrgs={initialOrgs} initialProjects={initialProjects} initialTeams={initialTeams} />;
      case "notifications":
        return <NotificationsManager initialData={initialNotifications} initialUsers={initialUsers} />;
      case "auditlogs":
        return <AuditLogsViewer initialData={initialAuditLogs} initialUsers={initialUsers} />;
      case "tokens":
        return <OnboardingLinksManager initialData={initialTokens} initialOrgs={initialOrgs} initialTeams={initialTeams} />;
      case "requests":
        return <JoinRequestsManager initialData={initialRequests} initialUsers={initialUsers} initialOrgs={initialOrgs} initialTeams={initialTeams} />;
      default:
        return <UsersManager initialData={initialUsers} />;
    }
  };

  return (
    <div className="relative min-h-screen w-full flex bg-surface-container-lowest text-on-surface overflow-hidden font-sans">

      {/* Sidebar navigation */}
      <aside className="w-sidebar-width h-screen sticky left-0 top-0 bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant flex flex-col p-unit-4 gap-unit-2 shrink-0">
        <div className="flex items-center gap-unit-3 mb-unit-6">
          <span className="text-headline-sm font-bold tracking-tight text-on-surface flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Aika Admin
          </span>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => handleSetActiveSection("users")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "users"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Users className="h-4 w-4" />
            <span className="font-label-md text-label-md">Users Pool</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("orgs")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "orgs"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Building className="h-4 w-4" />
            <span className="font-label-md text-label-md">Workspaces</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("teams")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "teams"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Layers className="h-4 w-4" />
            <span className="font-label-md text-label-md">Teams</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("projects")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "projects"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <FolderKanban className="h-4 w-4" />
            <span className="font-label-md text-label-md">Projects</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("tasks")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "tasks"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span className="font-label-md text-label-md">Tasks Backlog</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("timelogs")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "timelogs"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Clock className="h-4 w-4" />
            <span className="font-label-md text-label-md">Time Sheets</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("notifications")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "notifications"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Bell className="h-4 w-4" />
            <span className="font-label-md text-label-md">Alert Delivery</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("auditlogs")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "auditlogs"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Activity className="h-4 w-4" />
            <span className="font-label-md text-label-md">Audit Trail</span>
          </button>
          <div className="h-px bg-outline-variant my-2" />
          <button
            onClick={() => handleSetActiveSection("tokens")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "tokens"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <Link2 className="h-4 w-4" />
            <span className="font-label-md text-label-md">Onboarding Links</span>
          </button>
          <button
            onClick={() => handleSetActiveSection("requests")}
            className={`w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 rounded-lg transition-all active:scale-[0.98] duration-100 text-left ${activeSection === "requests"
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
          >
            <UserPlus className="h-4 w-4" />
            <span className="font-label-md text-label-md">Join Requests</span>
          </button>
        </nav>

        <div className="mt-auto pt-unit-4 border-t border-outline-variant space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg text-left"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="font-label-md text-label-md">{isDark ? "Light Theme" : "Dark Theme"}</span>
          </button>
          <Link href="/">
            <button className="w-full flex items-center gap-unit-3 px-unit-3 py-unit-2 text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg text-left">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-label-md text-label-md">Exit Workspace</span>
            </button>
          </Link>
        </div>
      </aside>

      {/* Main page area */}
      <main className="flex-1 flex flex-col bg-surface-container-lowest overflow-hidden h-screen">

        {/* Top Header */}
        <header className="h-16 sticky top-0 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-unit-6 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-body-md font-extrabold uppercase tracking-widest text-outline">
              Aika Administrative Platform Panel {!session?.user?.is_admin && initialOrgs && initialOrgs.length > 0 && `- ${initialOrgs.map((o: any) => o.name).join(", ")}`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-xs font-extrabold text-on-surface">{session?.user?.name}</span>
              <span className="text-[9px] font-bold text-primary font-mono-timer uppercase">
                {session?.user?.is_admin ? "Global Admin Console" : `Org Admin Console: ${initialOrgs?.map((o: any) => o.name).join(", ")}`}
              </span>
            </div>
            {session?.user?.image ? (
              <img src={session.user.image} alt={session.user.name} className="h-8 w-8 rounded-full border border-outline-variant" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                A
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Canvas area */}
        <section className="flex-1 overflow-y-auto custom-scrollbar p-unit-6 max-w-container-max mx-auto w-full space-y-6">

          {/* Quick-glance metrics summaries */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Total Users</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialUsers?.length ?? 0}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Workspaces</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialOrgs?.length ?? 0}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Active Teams</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialTeams?.filter((t: any) => !t.deleted_at).length ?? 0}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Projects</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialProjects?.filter((p: any) => !p.deleted_at).length ?? 0}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Tasks Backlog</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialTasks?.filter((t: any) => !t.deleted_at).length ?? 0}</div>
            </div>
            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 text-left">
              <span className="text-[10px] text-outline font-bold uppercase tracking-wide">Time Sessions</span>
              <div className="text-headline-sm font-black font-mono-timer mt-1 text-on-surface">{initialLogs?.filter((l: any) => !l.deleted_at).length ?? 0}</div>
            </div>
          </div>

          {/* Active section component wrapper */}
          <div className="glass-card rounded-2xl p-unit-6 bg-surface-container-low border border-outline-variant">
            {renderSection()}
          </div>

        </section>
      </main>
    </div>
  );
}
