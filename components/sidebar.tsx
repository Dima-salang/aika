"use client";

import React from "react";
import { Clock, User, Building2, LogOut, Sun, Moon, Inbox, Layers, Target, Settings, Menu, X, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: "logs" | "profile" | "org";
  setActiveTab: (tab: "logs" | "profile" | "org") => void;
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
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between w-full px-4 py-2.5 border-b border-zinc-200/40 bg-zinc-50/80 dark:border-zinc-800/40 dark:bg-[#0c0c0e]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs">
            A
          </div>
          <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Aika</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {isOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sticky Dark Linear Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-45 md:z-20 w-56 border-r border-zinc-200/30 bg-zinc-50 dark:border-zinc-850/40 dark:bg-[#0c0c0e] flex flex-col justify-between shrink-0 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:sticky md:h-screen md:top-0`}
      >
        <div className="flex flex-col gap-5 p-4">
          
          {/* Logo & Workspace Title */}
          <div className="hidden md:flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <div className="h-5.5 w-5.5 rounded-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
                A
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold tracking-tight text-zinc-900 dark:text-zinc-200 leading-none">Aika</span>
                <span className="text-[9px] text-zinc-400 font-semibold tracking-wide uppercase mt-0.5">Workspace</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Quick Actions / Inbox */}
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-1">
              Personal
            </div>
            
            <button
              onClick={() => {
                setActiveTab("logs");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-left transition-colors ${
                activeTab === "logs"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200"
                  : "text-zinc-550 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
              }`}
            >
              <Clock className="h-4 w-4 text-zinc-405 shrink-0" />
              <span>Time Logs</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("profile");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-left transition-colors ${
                activeTab === "profile"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200"
                  : "text-zinc-550 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
              }`}
            >
              <User className="h-4 w-4 text-zinc-405 shrink-0" />
              <span>My Profile</span>
            </button>
          </div>

          {/* Workspace Sections */}
          <div className="flex flex-col gap-0.5">
            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest px-2 mb-1">
              Workspace
            </div>

            <button
              onClick={() => {
                setActiveTab("org");
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-tight text-left transition-colors ${
                activeTab === "org"
                  ? "bg-zinc-200/50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-200"
                  : "text-zinc-550 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30"
              }`}
            >
              <Building2 className="h-4 w-4 text-zinc-405 shrink-0" />
              <span>Organization</span>
            </button>
          </div>
        </div>

        {/* User profile section at the bottom */}
        <div className="p-3 border-t border-zinc-200/20 dark:border-zinc-850/30">
          <div className="flex items-center justify-between p-1.5 rounded-xl bg-zinc-100/40 dark:bg-zinc-900/20 border border-zinc-200/30 dark:border-zinc-850/30">
            <div className="flex items-center gap-2 min-w-0">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name}
                  className="h-7 w-7 rounded-md border border-zinc-250 dark:border-zinc-800"
                />
              ) : (
                <div className="h-7 w-7 rounded-md bg-indigo-500/10 text-indigo-550 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {session?.user?.name?.charAt(0) || "U"}
                </div>
              )}
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[10px] font-extrabold text-zinc-900 dark:text-zinc-200 truncate">
                  {session?.user?.name || "User"}
                </span>
                <span className="text-[9px] text-zinc-400 truncate">
                  {session?.user?.email}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6.5 w-6.5 rounded-md text-zinc-400 hover:text-red-500"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
