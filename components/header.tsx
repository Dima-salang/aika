"use client";

import React from "react";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  runningTimer: any;
  handleStartTimer: () => void;
  setIsDialogOpen: (isOpen: boolean) => void;
  setEditingLog: (log: any) => void;
  session: any;
}

export function Header({
  searchQuery,
  setSearchQuery,
  isDark,
  toggleTheme,
  runningTimer,
  handleStartTimer,
  setIsDialogOpen,
  setEditingLog,
  session,
}: HeaderProps) {
  return (
    <header className="h-12 w-full sticky top-0 z-40 bg-surface dark:bg-surface-dim border-b border-outline-variant flex justify-between items-center px-unit-6 shrink-0">
      <div className="flex items-center gap-unit-4">
        <div className="flex items-center gap-unit-2 px-unit-3 py-1 bg-surface-container border border-outline-variant rounded-md min-w-[280px]">
          <span className="material-symbols-outlined text-outline" data-icon="search">
            search
          </span>
          <input
            id="global-search-input"
            className="bg-transparent border-none text-body-sm focus:ring-0 w-full placeholder:text-outline text-on-surface focus:outline-none"
            placeholder="Search logs..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-outline bg-surface-container-high border border-outline-variant rounded pointer-events-none select-none">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </div>
        <div className="hidden md:flex gap-unit-4">
          <a
            className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Docs
          </a>
          <a
            className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors"
            href="#"
          >
            Updates
          </a>
        </div>
      </div>
      <div className="flex items-center gap-unit-4">
        <div className="flex items-center gap-unit-2">
          <button
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-md transition-colors"
          >
            <span className="material-symbols-outlined" data-icon={isDark ? "light_mode" : "dark_mode"}>
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-md relative transition-colors">
            <span className="material-symbols-outlined" data-icon="notifications">
              notifications
            </span>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-error rounded-full"></span>
          </button>
        </div>
        <div className="w-8 h-8 rounded-full border border-outline-variant overflow-hidden">
          {session?.user?.image ? (
            <img
              alt="User Profile"
              className="w-full h-full object-cover"
              src={session.user.image}
            />
          ) : (
            <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
