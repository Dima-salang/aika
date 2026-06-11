"use client";

import React from "react";
import { useLayoutStore } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useAuth } from "@/components/providers/auth-provider";

interface SidebarProps {
  activeTab: "dashboard" | "logs" | "profile" | "org" | "projects" | "team" | "reports";
  setActiveTab: (tab: "dashboard" | "logs" | "profile" | "org" | "projects" | "team" | "reports") => void;
  session: any;
  handleSignOut: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  onOpenShortcuts?: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  session,
  handleSignOut,
  isDark,
  toggleTheme,
  onOpenShortcuts,
}: SidebarProps) {
  const [mounted, setMounted] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const { leftSidebarCollapsed, toggleLeftSidebar } = useLayoutStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const collapsed = mounted ? leftSidebarCollapsed : false;

  // Better Auth Hooks from global provider
  const { activeOrg, orgList } = useAuth();

  // Active Team state (fallback to user setting)
  const activeTeamId = session?.session?.activeTeamId || session?.user?.last_active_team_id || null;

  // tRPC User Teams
  const { data: userTeams } = trpc.getUserTeams.useQuery(
    { userId: session?.user?.id || "", organizationId: activeOrg?.id || "" },
    { enabled: !!session?.user?.id && !!activeOrg?.id }
  );

  const activeTeam = userTeams?.find((t) => t.id === activeTeamId);

  const setActiveTeamMutation = trpc.setActiveTeam.useMutation({
    onSuccess: () => {
      window.location.reload();
    }
  });

  const handleSelectOrg = async (orgId: string) => {
    setDropdownOpen(false);
    
    if (orgId === "org-default") {
      localStorage.setItem("aika-active-tab", "dashboard");
      await authClient.organization.setActive({ organizationId: null as any });
      await setActiveTeamMutation.mutateAsync({ userId: session.user.id, teamId: null });
    } else {
      await authClient.organization.setActive({ organizationId: orgId });
      // Set tab to team optimistically if the org has teams, otherwise dashboard.
      // We will let the main Page component resolve the actual team redirection,
      // but we pre-set the tab to 'team' if we are switching to a non-default org to avoid flashing.
      localStorage.setItem("aika-active-tab", "team");
      await setActiveTeamMutation.mutateAsync({ userId: session.user.id, teamId: null });
    }
  };

  const handleSelectTeam = async (teamId: string | null) => {
    setDropdownOpen(false);
    localStorage.setItem("aika-active-tab", teamId ? "team" : "dashboard");
    await setActiveTeamMutation.mutateAsync({ userId: session.user.id, teamId });
  };

  const currentOrgId = activeOrg?.id || "org-default";
  const allOrgs = orgList ? [...orgList] : [];
  if (!allOrgs.some((o) => o.id === "org-default")) {
    allOrgs.unshift({
      id: "org-default",
      name: "Default Workspace",
      slug: "default",
      createdAt: new Date(),
      metadata: null,
      logo: null,
    });
  }

  return (
    <aside
      className={`h-screen sticky left-0 top-0 bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant flex flex-col gap-unit-2 shrink-0 transition-all duration-300 z-30 ${
        collapsed ? "w-16 p-unit-2" : "w-sidebar-width p-unit-4"
      }`}
      aria-label="Primary Navigation"
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 mb-unit-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
            A
          </div>
          <button
            onClick={toggleLeftSidebar}
            className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
            aria-label="Expand Sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-unit-4 min-h-[40px] relative w-full" ref={dropdownRef}>
          <div className="flex-1 flex flex-col mr-2 min-w-0">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={setActiveTeamMutation.isPending}
              className="w-full min-w-0 flex items-center justify-between gap-2 px-unit-3 py-1.5 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container transition-all text-left shadow-sm active:scale-[0.99] disabled:opacity-70"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-body-sm font-extrabold text-on-surface truncate">
                  {activeOrg?.name || "Default Workspace"}
                </span>
                <span className="text-[10px] text-outline font-medium truncate flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px] leading-none">
                    {activeTeam ? "groups" : "person"}
                  </span>
                  {activeTeam?.name || "Personal View"}
                </span>
              </div>
              {setActiveTeamMutation.isPending ? (
                <span className="animate-spin text-primary inline-flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">progress_activity</span>
                </span>
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
                  unfold_more
                </span>
              )}
            </button>
          </div>

          <button
            onClick={toggleLeftSidebar}
            className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
            aria-label="Collapse Sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute top-12 left-0 w-64 bg-surface dark:bg-surface-dim border border-outline-variant rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Organizations Section */}
              <div className="px-3 py-1.5 text-[10px] font-bold text-outline uppercase tracking-wider">
                Organizations
              </div>
              <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                {allOrgs.map((org) => {
                  const isSelected = currentOrgId === org.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                        isSelected
                          ? "bg-secondary-container text-on-secondary-container"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">corporate_fare</span>
                        {org.name}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Teams Section */}
              {activeOrg && (
                <>
                  <div className="border-t border-outline-variant/50 my-1.5" />
                  <div className="px-3 py-1.5 text-[10px] font-bold text-outline uppercase tracking-wider flex justify-between items-center">
                    <span>Teams</span>
                    {activeTeam && (
                      <span className="text-[9px] lowercase bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        in org
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => handleSelectTeam(null)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                        activeTeamId === null
                          ? "bg-secondary-container text-on-secondary-container"
                          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                      }`}
                    >
                      <span className="truncate flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        Personal View
                      </span>
                      {activeTeamId === null && (
                        <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                      )}
                    </button>

                    {userTeams && userTeams.length > 0 && (
                      userTeams.map((team) => {
                        const isSelected = activeTeamId === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => handleSelectTeam(team.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all ${
                              isSelected
                                ? "bg-secondary-container text-on-secondary-container"
                                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                            }`}
                          >
                            <span className="truncate flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px]">groups</span>
                              {team.name}
                            </span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <nav className="flex-1 space-y-1" aria-label="Main Navigation Links">
        {[
          { id: "dashboard", label: "Dashboard", icon: "dashboard" },
          { id: "logs", label: "Tracker", icon: "timer" },
          { id: "projects", label: "Projects & Tasks", icon: "work" },
          { id: "team", label: "Team Space", icon: "groups" },
          { id: "reports", label: "Reports", icon: "bar_chart" },
          { id: "profile", label: "Profile", icon: "person" },
          { id: "org", label: "Organization", icon: "corporate_fare" },
        ].map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center rounded-lg transition-all active:scale-[0.98] duration-100 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                collapsed ? "justify-center p-2.5" : "gap-unit-3 px-unit-3 py-unit-2"
              } ${
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
              aria-current={isActive ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <span className="material-symbols-outlined text-[20px]" data-icon={item.icon}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="font-label-md text-label-md truncate animate-in fade-in duration-200">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Settings & Actions */}
      <div className="mt-auto pt-unit-4 border-t border-outline-variant space-y-1.5">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
            collapsed ? "justify-center p-2.5" : "gap-unit-3 px-unit-3 py-unit-2"
          }`}
          aria-label={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          title={collapsed ? (isDark ? "Light Mode" : "Dark Mode") : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">{isDark ? "light_mode" : "dark_mode"}</span>
          {!collapsed && (
            <span className="font-label-md text-label-md truncate animate-in fade-in duration-200">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        <button
          onClick={handleSignOut}
          className={`w-full flex items-center text-on-surface-variant hover:bg-surface-container-high transition-colors rounded-lg text-left hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400 ${
            collapsed ? "justify-center p-2.5" : "gap-unit-3 px-unit-3 py-unit-2"
          }`}
          aria-label="Logout"
          title={collapsed ? "Logout" : undefined}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed && (
            <span className="font-label-md text-label-md truncate animate-in fade-in duration-200">
              Logout
            </span>
          )}
        </button>

        {/* Keyboard Shortcut Legend */}
        {!collapsed && (
          <div className="mt-unit-6 px-unit-3 animate-in fade-in duration-300">
            <button
              onClick={onOpenShortcuts}
              className="w-full flex justify-between items-center text-[10px] uppercase tracking-widest text-primary hover:text-primary/80 font-bold transition-all text-left mb-unit-3 group focus:outline-none"
            >
              <span>Shortcuts ( ? )</span>
              <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">keyboard</span>
            </button>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                <span>Toggle Timer</span>
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant rounded font-mono-timer">T</kbd>
              </div>
              <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                <span>New Log</span>
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant rounded font-mono-timer">N</kbd>
              </div>
              <div className="flex justify-between items-center text-[11px] text-on-surface-variant text-primary font-bold">
                <span>Help Guide</span>
                <kbd className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded font-mono-timer">?</kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
