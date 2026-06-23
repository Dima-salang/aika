"use client";

import React, { useState, useMemo } from "react";
import {
  Clock,
  Loader2,
  Search,
  User as UserIcon,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle,
  FileText,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { ActivityLogItem } from "@/components/team/activity-log-item";
import { useImageViewer } from "@/utils/image-viewer-store";

interface TimelineTask {
  id: string;
  title: string;
}

interface TimelineEvidence {
  id: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
}

interface TimelineLog {
  id: string;
  user_id: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  userRole: string;
  project_id: string | null;
  projectName: string | null;
  start_time: Date | string;
  end_time: Date | string;
  title: string;
  description: string | null;
  tasks: TimelineTask[];
  evidence: TimelineEvidence[];
}

interface TeamMember {
  id: string;
  userId: string;
  role: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}

interface TeamTimelineFeedProps {
  timeline: TimelineLog[];
  timelineLoading: boolean;
  members: TeamMember[];
  search: string;
  setSearch: (s: string) => void;
  role: string;
  setRole: (r: string) => void;
  selectedUser: string;
  setSelectedUser: (u: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onSelect?: (log: any) => void;
  onShare?: (log: any) => void;
  onSelectUser?: (userId: string) => void;
}

// Color coding helpers matching tracker page, optimized for light and dark high-contrast
const getProjectColorBadge = (projName: string) => {
  const colors = [
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 dark:border-indigo-500/30",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 dark:border-emerald-500/30",
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 dark:border-amber-500/30",
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 dark:border-rose-500/30",
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 dark:border-violet-500/30",
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30 dark:border-sky-500/30",
  ];
  let hash = 0;
  for (let i = 0; i < projName.length; i++) {
    hash = projName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

const getTaskColorBadge = (taskTitle: string) => {
  const colors = [
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 dark:border-sky-500/25",
    "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/25",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30 dark:border-cyan-500/25",
    "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/30 dark:border-teal-500/25",
    "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 dark:border-orange-500/25",
  ];
  let hash = 0;
  for (let i = 0; i < taskTitle.length; i++) {
    hash = taskTitle.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % colors.length;
  return colors[idx];
};

export function TeamTimelineFeed({
  timeline,
  timelineLoading,
  members,
  search,
  setSearch,
  role,
  setRole,
  selectedUser,
  setSelectedUser,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  onSelect,
  onShare,
  onSelectUser
}: TeamTimelineFeedProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Group Logs by Day (for logical timeline representation)
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, TimelineLog[]> = {};
    timeline.forEach((log) => {
      const dateKey = new Date(log.start_time).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    });
    return Object.entries(groups);
  }, [timeline]);

  return (
    <div className="w-full h-full max-w-4xl mx-auto">
      {/* Feed & Controls Panel */}
      <div className="flex flex-col min-w-0 w-full">

        {/* Advanced Filter Toolbar */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
              <Filter className="h-3.5 w-3.5 text-primary" /> Filter Feed Activity
            </span>
            {(search || role !== "all" || selectedUser !== "all" || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearch("");
                  setRole("all");
                  setSelectedUser("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-outline" />
              <input
                type="text"
                placeholder="Search description, task..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>

            {/* Role select */}
            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Roles</option>
                <option value="leader">Leader</option>
                <option value="member">Member</option>
              </select>
            </div>

            {/* Member select */}
            <div>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Members</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userName}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            {/* End Date */}
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Timeline Stream */}
        {timelineLoading ? (
          <div className="flex justify-center items-center py-20 bg-surface-container border border-outline-variant rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs text-outline font-medium">Fetching history...</span>
            </div>
          </div>
        ) : groupedTimeline.length > 0 ? (
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/40 dark:before:bg-outline/20">
            {groupedTimeline.map(([dayLabel, logs]) => (
              <div key={dayLabel} className="space-y-4">

                {/* Day Header Badge */}
                <div className="relative pl-12">
                  <div className="absolute left-[11px] top-1.5 h-4 w-4 rounded-full border-2 border-outline-variant bg-surface-low flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <span className="text-[11px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    {dayLabel}
                  </span>
                </div>

                {logs.map((log) => (
                  <ActivityLogItem
                    key={log.id}
                    log={log}
                    showUser={true}
                    compact={false}
                    onSelect={onSelect}
                    onShare={onShare}
                    onSelectUser={onSelectUser}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-outline-variant rounded-xl bg-surface-container">
            <AlertCircle className="h-8 w-8 text-outline mx-auto mb-2" />
            <p className="text-outline text-xs font-semibold">No activity logs recorded matching the criteria.</p>
          </div>
        )}

        {/* Infinite scrolling sentinel and loader */}
        {isFetchingNextPage && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <div ref={sentinelRef} className="h-2 w-full" />
      </div>
    </div>
  );
}
