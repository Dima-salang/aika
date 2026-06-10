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

export function TeamTimelineFeed({ timeline, timelineLoading, members }: TeamTimelineFeedProps) {
  // Filter States
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter Logs
  const filteredTimeline = useMemo(() => {
    return timeline.filter((log) => {
      // 1. Search Query
      if (search.trim()) {
        const query = search.toLowerCase();
        const titleMatch = log.title?.toLowerCase().includes(query);
        const descMatch = log.description?.toLowerCase().includes(query);
        const nameMatch = log.userName?.toLowerCase().includes(query);
        const emailMatch = log.userEmail?.toLowerCase().includes(query);
        const projectMatch = log.projectName?.toLowerCase().includes(query);
        const taskMatch = log.tasks?.some(t => t.title.toLowerCase().includes(query));
        if (!titleMatch && !descMatch && !nameMatch && !emailMatch && !projectMatch && !taskMatch) {
          return false;
        }
      }

      // 2. Role Filter
      if (role !== "all" && log.userRole !== role) {
        return false;
      }

      // 3. User Filter
      if (selectedUser !== "all" && log.user_id !== selectedUser) {
        return false;
      }

      // 4. Start Date
      if (startDate) {
        const logStart = new Date(log.start_time).getTime();
        const filterStart = new Date(startDate).getTime();
        if (logStart < filterStart) return false;
      }

      // 5. End Date
      if (endDate) {
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        const logEnd = new Date(log.end_time).getTime();
        if (logEnd > filterEnd.getTime()) return false;
      }

      return true;
    });
  }, [timeline, search, role, selectedUser, startDate, endDate]);

  // Group Logs by Day (for logical timeline representation)
  const groupedTimeline = useMemo(() => {
    const groups: Record<string, TimelineLog[]> = {};
    filteredTimeline.forEach((log) => {
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
  }, [filteredTimeline]);

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
          <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-outline-variant">
            {groupedTimeline.map(([dayLabel, logs]) => (
              <div key={dayLabel} className="space-y-4">
                
                {/* Day Header Badge */}
                <div className="relative pl-12">
                  <div className="absolute left-[11px] top-1.5 h-4 w-4 rounded-full border-2 border-outline-variant bg-surface flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <span className="text-[11px] font-extrabold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wider">
                    {dayLabel}
                  </span>
                </div>

                {logs.map((log) => {
                  const durationMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
                  const minutes = Math.floor(durationMs / 60000);
                  const hrs = Math.floor(minutes / 60);
                  const mins = minutes % 60;
                  const durationFormatted = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                  
                  return (
                    <div key={log.id} className="relative pl-12 group animate-in fade-in duration-300">
                      
                      {/* Timeline dot */}
                      <div className="absolute left-[13px] top-4 h-3.5 w-3.5 rounded-full border-2 border-outline-variant bg-surface group-hover:border-primary transition-colors flex items-center justify-center">
                        <div className="h-1 w-1 rounded-full bg-outline group-hover:bg-primary transition-colors" />
                      </div>
 
                      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 hover:border-outline transition-all space-y-4 cursor-default">
                        
                        {/* Header details */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            {log.userImage ? (
                              <img src={log.userImage} alt={log.userName} className="h-8 w-8 rounded-full border border-outline-variant" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-outline-variant">
                                {log.userName.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-on-surface">{log.userName}</span>
                                <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${
                                  log.userRole === "leader" ? "bg-tertiary-container text-on-tertiary-container" : "bg-secondary-container text-on-secondary-container"
                                }`}>
                                  {log.userRole}
                                </span>
                              </div>
                              <span className="text-[10px] text-outline block">{log.userEmail}</span>
                            </div>
                          </div>
 
                          <div className="flex items-center gap-1.5 bg-surface-container-highest border border-outline-variant/60 px-2 py-0.5 rounded text-[10px] font-bold text-primary">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono-timer">{durationFormatted}</span>
                          </div>
                        </div>

                        {/* Title and descriptions */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-on-surface leading-snug group-hover:text-primary transition-colors">
                              {log.title || "Untitled Activity"}
                            </h4>
                            {log.projectName ? (
                              <span className={`px-2.5 py-0.5 text-[10px] rounded border font-bold uppercase tracking-wider ${getProjectColorBadge(log.projectName)}`}>
                                {log.projectName}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border border-zinc-500/20 text-[10px] rounded font-bold uppercase tracking-wider">
                                Internal Tasks
                              </span>
                            )}
                          </div>
                          {log.description && (
                            <p className="text-xs text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                              {log.description}
                            </p>
                          )}
                        </div>

                        {/* Associated Tasks */}
                        {log.tasks && log.tasks.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] font-extrabold uppercase text-outline tracking-wider block">Linked Tasks</span>
                            <div className="flex flex-wrap gap-1.5">
                              {log.tasks.map((task) => (
                                <span 
                                  key={task.id}
                                  className={`px-2.5 py-0.5 text-[10px] rounded border font-semibold ${getTaskColorBadge(task.title)}`}
                                >
                                  #{task.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Larger Clock In / Out Displays */}
                        <div className="flex items-center gap-6 pt-3 border-t border-outline-variant/20">
                          <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/40 rounded-lg p-3">
                            <span className="uppercase block text-[8px] tracking-wider mb-1 text-outline font-bold">Clock In</span>
                            <span className="font-mono-timer text-lg font-extrabold text-on-surface tracking-tight block">
                              {new Date(log.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-outline block mt-0.5">
                              {new Date(log.start_time).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex-1 bg-surface-container-lowest/50 border border-outline-variant/40 rounded-lg p-3">
                            <span className="uppercase block text-[8px] tracking-wider mb-1 text-outline font-bold">Clock Out</span>
                            <span className="font-mono-timer text-lg font-extrabold text-on-surface tracking-tight block">
                              {new Date(log.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-outline block mt-0.5">
                              {new Date(log.end_time).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Evidence Capture proofs */}
                        {log.evidence && log.evidence.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-outline-variant/20">
                            <span className="text-[9px] font-bold uppercase text-outline tracking-wider block">Attached Proofs ({log.evidence.length})</span>
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const imageList = log.evidence
                                  .filter((e: any) => e.mime_type?.startsWith("image/"))
                                  .map((e: any) => e.file_url);

                                return log.evidence.map((ev) => {
                                  const isImage = ev.mime_type?.startsWith("image/");
                                  return (
                                    <button
                                      key={ev.id}
                                      onClick={() => {
                                        if (isImage) {
                                          const imgIdx = imageList.indexOf(ev.file_url);
                                          useImageViewer.getState().open(imageList, imgIdx >= 0 ? imgIdx : 0);
                                        } else {
                                          window.open(ev.file_url, "_blank");
                                        }
                                      }}
                                      className="relative h-12 w-20 border border-outline-variant rounded overflow-hidden hover:scale-105 active:scale-95 transition-all block shadow-sm group/ev cursor-pointer text-left focus:outline-none"
                                    >
                                      {isImage ? (
                                        <img src={ev.file_url} alt={ev.file_name} className="h-full w-full object-cover" />
                                      ) : (
                                        <div className="h-full w-full flex flex-col items-center justify-center bg-surface-container-high/40 text-[7px] text-center p-1 text-on-surface">
                                          <FileText className="h-3.5 w-3.5 text-primary mb-0.5" />
                                          <span className="truncate w-full font-bold px-0.5">{ev.file_name}</span>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/ev:opacity-100 flex items-center justify-center transition-all">
                                        <ExternalLink className="h-4.5 w-4.5 text-white" />
                                      </div>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-outline-variant rounded-xl bg-surface-container">
            <AlertCircle className="h-8 w-8 text-outline mx-auto mb-2" />
            <p className="text-outline text-xs font-semibold">No activity logs recorded matching the criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
