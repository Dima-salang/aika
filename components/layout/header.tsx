"use client";

import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/utils/trpc";
import { Bell, Check, Trash2, X, Info, Users, Clock, AlertTriangle, CheckSquare } from "lucide-react";
import { toast } from "sonner";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const userId = session?.user?.id || "";

  // Fetch notifications
  const { data: notifications, refetch } = trpc.getNotifications.useQuery(
    { userId },
    { enabled: !!userId }
  );

  // Mutations
  const markAsRead = trpc.markAsRead.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message || "Failed to mark as read"),
  });

  const markAllAsRead = trpc.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("All notifications marked as read");
    },
    onError: (err) => toast.error(err.message || "Failed to mark all as read"),
  });

  const deleteNotification = trpc.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Notification dismissed");
    },
    onError: (err) => toast.error(err.message || "Failed to delete notification"),
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    return past.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "team_invitation":
        return <Users className="h-4 w-4 text-purple-400" />;
      case "task_update":
        return <CheckSquare className="h-4 w-4 text-blue-400" />;
      case "time_log":
        return <Clock className="h-4 w-4 text-amber-400" />;
      case "team_switch":
        return <Info className="h-4 w-4 text-teal-400" />;
      default:
        return <Bell className="h-4 w-4 text-outline" />;
    }
  };

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
          
          {/* Notifications Dropdown Anchor */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-md relative transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full animate-pulse"></span>
              )}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container border border-outline-variant rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[420px]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-high">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/20 text-primary">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead.mutate({ userId })}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto divide-y divide-outline-variant/50 max-h-[320px] custom-scrollbar">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => !n.is_read && markAsRead.mutate({ id: n.id })}
                        className={`p-3 text-xs flex gap-2.5 items-start hover:bg-surface-container-highest/30 transition-colors cursor-pointer group ${
                          !n.is_read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline gap-1">
                            <span className={`font-bold truncate ${!n.is_read ? "text-on-surface" : "text-on-surface-variant"}`}>
                              {n.title}
                            </span>
                          </div>
                          <p className="text-[10px] text-on-surface-variant mt-0.5 line-clamp-2 pr-1">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-outline mt-1 block">
                            {getRelativeTime(n.created_at)}
                          </span>
                        </div>
                        <div className="shrink-0 flex items-center justify-end gap-1.5 min-w-[32px] h-full self-stretch">
                          {!n.is_read && (
                            <span className="w-1.5 h-1.5 bg-primary rounded-full group-hover:hidden"></span>
                          )}
                          <div className="hidden group-hover:flex items-center gap-1">
                            {!n.is_read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead.mutate({ id: n.id });
                                }}
                                className="p-1 hover:bg-surface-container-high rounded text-outline hover:text-primary transition-colors"
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification.mutate({ id: n.id });
                              }}
                              className="p-1 hover:bg-error-container/20 rounded text-outline hover:text-red-400 transition-colors"
                              title="Dismiss"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-outline flex flex-col items-center gap-2">
                      <Bell className="h-6 w-6 text-outline/40" />
                      <span className="text-[11px] font-medium">All caught up! No notifications.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
