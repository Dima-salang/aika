"use client";

import React from "react";
import { useLayoutStore } from "@/lib/store";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarProps {
  activeTab: "logs" | "profile" | "org" | "projects";
  setActiveTab: (tab: "logs" | "profile" | "org" | "projects") => void;
  session: any;
  handleSignOut: () => void;
  isDark: boolean;
  toggleTheme: () => void;
}

export function Sidebar({
  activeTab,
  setActiveTab,
  session,
  handleSignOut,
  isDark,
  toggleTheme,
}: SidebarProps) {
  const [mounted, setMounted] = React.useState(false);
  const { leftSidebarCollapsed, toggleLeftSidebar } = useLayoutStore();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const collapsed = mounted ? leftSidebarCollapsed : false;

  return (
    <aside
      className={`h-screen sticky left-0 top-0 bg-surface-container-low dark:bg-surface-dim border-r border-outline-variant flex flex-col p-unit-4 gap-unit-2 shrink-0 transition-all duration-300 z-30 ${
        collapsed ? "w-16" : "w-sidebar-width"
      }`}
      aria-label="Primary Navigation"
    >
      {/* Header / Logo */}
      <div className="flex items-center justify-between mb-unit-6 min-h-[32px]">
        {!collapsed && (
          <span className="text-headline-sm font-headline-sm font-bold text-on-surface animate-in fade-in duration-200">
            Aika
          </span>
        )}
        <button
          onClick={toggleLeftSidebar}
          className="p-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95 ml-auto"
          aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex-1 space-y-1" aria-label="Main Navigation Links">
        {[
          { id: "logs", label: "Tracker", icon: "timer" },
          { id: "projects", label: "Projects & Tasks", icon: "work" },
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
            <p className="font-label-md text-[10px] uppercase tracking-widest text-outline mb-unit-3">Shortcuts</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                <span>Start/Stop</span>
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant rounded font-mono-timer">S</kbd>
              </div>
              <div className="flex justify-between items-center text-[11px] text-on-surface-variant">
                <span>Focus Task</span>
                <kbd className="px-1.5 py-0.5 bg-surface-container-highest border border-outline-variant rounded font-mono-timer">T</kbd>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
